const fs = require('fs');

let adminCode = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace table header
adminCode = adminCode.replace(
  /<TableHead className="cursor-pointer" onClick=\{\(\) => toggleSort\('firstName'\)\}>Name <SortIcon field="firstName"\/><\/TableHead>/g,
  `<TableHead className="cursor-pointer" onClick={() => toggleSort('firstName')}>First Name <SortIcon field="firstName"/></TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort('lastName')}>Last Name <SortIcon field="lastName"/></TableHead>`
);

// Replace table cell
adminCode = adminCode.replace(
  /<TableCell className="font-medium">\{p\.firstName\} \{p\.lastName\}<\/TableCell>/g,
  `<TableCell className="font-medium">{p.firstName}</TableCell>
                          <TableCell className="font-medium">{p.lastName}</TableCell>`
);

// Do the same for unverified users
adminCode = adminCode.replace(
  /<TableHead>Name<\/TableHead>/g,
  `<TableHead>First Name</TableHead>\n<TableHead>Last Name</TableHead>`
);

adminCode = adminCode.replace(
  /<TableCell className="font-medium">\{u\.firstName\} \{u\.lastName\}<\/TableCell>/g,
  `<TableCell className="font-medium">{u.firstName}</TableCell>
                        <TableCell className="font-medium">{u.lastName}</TableCell>`
);

fs.writeFileSync('src/pages/Admin.tsx', adminCode);
console.log('Patched Admin.tsx for Last Name column');
