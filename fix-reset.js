import fs from 'fs';
const file = './src/components/auth/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(`setForm({
                    identifier: "",
                    password: "",
                    name: "",
                    role: "Customer",
                  });`, `setForm({
                    identifier: "",
                    password: "",
                    name: "",
                    mobile: "",
                    role: "Customer",
                  });`);
fs.writeFileSync(file, content, 'utf8');
