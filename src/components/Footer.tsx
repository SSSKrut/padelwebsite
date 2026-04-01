 import { Link } from "react-router-dom";
 import { Instagram, Send } from "lucide-react";
 import siteData from "../../data/site.json";
 import partnersData from "../../data/partners.json";
 
 export const Footer = () => {
+  const goldenSponsors = partnersData.filter((partner) => partner.category === "golden");
+  const informationalPartners = partnersData.filter(
+    (partner) => partner.category === "informational",
+  );
+
   return (
     <footer className="bg-card border-t mt-16">
       <div className="container mx-auto px-4 py-12">
         {/* Partners Section */}
         <div className="mb-8 pb-8 border-b">
-          <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
-            OUR PARTNERS
+          <h3 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
+            GOLDEN SPONSORS
+          </h3>
+          <div className="flex flex-wrap items-center justify-center gap-8 mb-6">
+            {goldenSponsors.map((partner) => (
+              <a
+                key={partner.name}
+                href={partner.url}
+                target="_blank"
+                rel="noopener noreferrer"
+                className="text-muted-foreground hover:text-foreground transition-colors"
+              >
+                {partner.name}
+              </a>
+            ))}
+          </div>
+
+          <h3 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
+            INFORMATIONAL PARTNERS
           </h3>
           <div className="flex flex-wrap items-center justify-center gap-8">
-            {partnersData.map((partner) => (
+            {informationalPartners.map((partner) => (
               <a
                 key={partner.name}
                 href={partner.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-muted-foreground hover:text-foreground transition-colors"
               >
                 {partner.name}
               </a>
             ))}
           </div>
         </div>
 
         <div className="grid md:grid-cols-3 gap-8">
           {/* Brand */}
           <div>
             <h3 className="text-lg font-bold text-primary mb-2">{siteData.brand}</h3>
             <p className="text-sm text-muted-foreground">{siteData.address}</p>
             <p className="text-sm text-muted-foreground mt-2">{siteData.email}</p>
           </div>
 
           {/* Social */}
           <div>
             <h4 className="font-semibold mb-3">Follow Us</h4>
             <div className="flex gap-4">
