const fs = require('fs');
let code = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// remove duplicate UserRole block
code = code.replace(/export enum UserRole \{\n  SUPER_ADMIN = "SUPER_ADMIN",\n  ADMIN = "ADMIN",\n  USER = "USER",\n  UNVERIFIED_USER = "UNVERIFIED_USER",\n\}\n\nexport enum UserRole \{/g, "export enum UserRole {");

fs.writeFileSync('src/context/AuthContext.tsx', code);
