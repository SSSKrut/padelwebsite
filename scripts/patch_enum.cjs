const fs = require('fs');

let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const enumCode = `export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  USER = "USER",
  UNVERIFIED_USER = "UNVERIFIED_USER",
}

export interface User {`;

code = code.replace(/export interface User \{/g, enumCode);
code = code.replace(/role: "SUPER_ADMIN" \| "ADMIN" \| "USER" \| "UNVERIFIED_USER";/g, `role: UserRole;`);

fs.writeFileSync('src/context/AuthContext.tsx', code);
console.log('Patched AuthContext.tsx');
