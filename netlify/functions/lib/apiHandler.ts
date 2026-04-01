import type { Handler, HandlerEvent } from "@netlify/functions";
import { z } from "zod";
import { verifyUser } from "./auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface HandlerContext<BodyType = any> {
  event: HandlerEvent;
  body: BodyType;
  user?: any;
}

interface HandlerOptions<T extends z.ZodTypeAny> {
  method?: HttpMethod | HttpMethod[];
  requireAuth?: boolean;
  requireAdmin?: boolean;
  bodySchema?: T;
  handler: (ctx: HandlerContext<z.infer<T>>) => Promise<any>;
}

export function defineHandler<T extends z.ZodTypeAny = z.ZodTypeAny>(
  options: HandlerOptions<T>
): Handler {
  return async (event: HandlerEvent) => {
    try {
      // 1. Check HTTP Method
      if (options.method) {
        const allowedMethods = Array.isArray(options.method)
          ? options.method
          : [options.method];
        if (!allowedMethods.includes(event.httpMethod as HttpMethod)) {
          return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
          };
        }
      }

      let user = undefined;

      // 2. Auth checks
      if (options.requireAuth || options.requireAdmin) {
        try {
          user = await verifyUser(event);
          if (
            options.requireAdmin &&
            user.role !== "ADMIN" &&
            user.role !== "SUPER_ADMIN"
          ) {
            return {
              statusCode: 403,
              body: JSON.stringify({ error: "Forbidden. Admin access required." }),
            };
          }
        } catch (err: any) {
          return {
            statusCode: err.message === "Forbidden" ? 403 : 401,
            body: JSON.stringify({ error: err.message || "Unauthorized" }),
          };
        }
      }

      // 3. Body validation with Zod
      let parsedBody = {} as z.infer<T>;
      if (options.bodySchema && ["POST", "PUT", "PATCH"].includes(event.httpMethod)) {
        try {
          const rawBody = event.body ? JSON.parse(event.body) : {};
          const result = options.bodySchema.safeParse(rawBody);
          
          if (!result.success) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                error: "Validation Error",
                details: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
              }),
            };
          }
          parsedBody = result.data;
        } catch (e) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid JSON in request body" }),
          };
        }
      }

      // 4. Execute the main business logic
      const response = await options.handler({ event, body: parsedBody, user });

      // If the handler returned a full Netlify response object with a statusCode, return it as is
      if (response && typeof response === "object" && "statusCode" in response) {
        return response;
      }

      // Otherwise, assume it returned JSON data (success)
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      };

    } catch (error: any) {
      console.error(`[API Error] ${event.httpMethod} ${event.path}:`, error);

      let message = "Internal Server Error";
      const code = error?.code;
      if (code === "P1001" || code === "P1002") {
        message = "Database connection failed. Check DATABASE_URL.";
      } else if (code === "P2021") {
        message = "Database table not found. Run prisma migrate deploy.";
      } else if (error?.statusCode) {
        message = error.message || message;
      }

      return {
        statusCode: error?.statusCode || 500,
        body: JSON.stringify({ error: message }),
      };
    }
  };
}