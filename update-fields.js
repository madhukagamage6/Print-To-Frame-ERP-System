import fs from 'fs';
const file = './src/components/auth/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

const fieldsOld = `                <div>
                  <label className="font-sans text-xs text-on-surface-variant block mb-1.5 ml-1">Mobile Number (or Email)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline/60" />
                    <input
                      type="text"
                      placeholder="admin or email..."
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary-container transition-all"
                      value={form.identifier}
                      onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    />
                  </div>
                </div>`;

const fieldsNew = `                <div>
                  <label className="font-sans text-xs text-on-surface-variant block mb-1.5 ml-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline/60" />
                    <input
                      type="tel"
                      placeholder="+94 7X XXX XXXX"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary-container transition-all"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    />
                  </div>
                </div>`;
content = content.replace(fieldsOld, fieldsNew);

const alwaysVisibleOld = `            {/* Always visible fields (when login view, show identifier here) */}
            {isLoginView && (
              <div>
                <label className="font-sans text-xs text-on-surface-variant block mb-1.5 ml-1">Email or Mobile</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline/60" />
                  <input
                    type="text"
                    placeholder="admin or email..."
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary-container transition-all"
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  />
                </div>
              </div>
            )}`;

const alwaysVisibleNew = `            {/* Always visible fields */}
            <div>
              <label className="font-sans text-xs text-on-surface-variant block mb-1.5 ml-1">Email or Mobile</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline/60" />
                <input
                  type="text"
                  placeholder="admin or email..."
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary-container transition-all"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                />
              </div>
            </div>`;
content = content.replace(alwaysVisibleOld, alwaysVisibleNew);

// Add mobile to initial state
content = content.replace(`identifier: "",
    password: "",
    name: "",
    role: "Customer",`, `identifier: "",
    password: "",
    name: "",
    mobile: "",
    role: "Customer",`);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Login.jsx fields successfully!");
