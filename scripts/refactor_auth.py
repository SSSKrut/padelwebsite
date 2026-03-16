import os
import glob

for filepath in glob.glob("netlify/functions/admin-*.ts"):
    with open(filepath, "r") as f:
        content = f.read()
    
    # Remove old verifyAdmin and imports
    import_verifyadmin = "import { verifyAdmin } from \"./lib/auth\";\n"
    
    if "const verifyAdmin" in content:
        start_idx = content.find("const verifyAdmin = async")
        end_idx = content.find("};", start_idx) + 2
        
        # also add import if it's not there
        if "from \"./lib/auth\"" not in content:
            content = import_verifyadmin + content[:start_idx] + content[end_idx:]
        else:
            content = content[:start_idx] + content[end_idx:]
            
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Updated {filepath}")
