const fs = require('fs');

let adminCode = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace table header
adminCode = adminCode.replace(
  /<TableHead className="cursor-pointer" onClick=\{\(\) => toggleSort\('elo'\)\}>ELO <SortIcon field="elo"\/><\/TableHead>/g,
  '<TableHead className="cursor-pointer" onClick={() => toggleSort(\'elo\')}>ELO <SortIcon field="elo"/></TableHead>\n                        <TableHead>Achievements</TableHead>'
);

// Replace table row contents inside sortedPlayers.map
const beforeRow = `<TableCell>
                            {playerForm?.id === p.id ? (`;

const replaceWith = `<TableCell>
                            <div className="flex flex-col gap-1">
                            {p.achievements?.map((ua: any) => (
                              <div key={ua.id} className="flex items-center justify-between text-xs py-1 px-2 bg-secondary rounded-md">
                                <span className="truncate max-w-[120px]" title={ua.achievement?.title}>{ua.achievement?.title}</span>
                                <button onClick={() => confirmAction("Remove Achievement", "Are you sure?", () => removeAch.mutate({ userAchievementId: ua.id }))} className="text-destructive hover:text-red-600 ml-2">x</button>
                              </div>
                            ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {playerForm?.id === p.id ? (`;

adminCode = adminCode.replace(beforeRow, replaceWith);

// Replace Actions cell to add demote/role actions
const actionsOriginal = `<Button size="sm" variant="outline" onClick={() => setPlayerForm({ id: p.id, elo: p.elo })}><Edit className="w-4 h-4"/></Button>
                                <Button size="sm" variant="secondary" onClick={() => setGrantAchForm({ userId: p.id, achId: "" })}><Trophy className="w-4 h-4 mr-1"/> Grant</Button>`;

const actionsNew = `<div className="flex flex-wrap gap-2 justify-end">
                                  <Button size="sm" variant="outline" onClick={() => setPlayerForm({ id: p.id, elo: p.elo })} title="Edit ELO"><Edit className="w-4 h-4"/></Button>
                                  <Button size="sm" variant="secondary" onClick={() => setGrantAchForm({ userId: p.id, achId: "" })} title="Grant Achievement"><Trophy className="w-4 h-4"/></Button>
                                  
                                  {p.role !== "UNVERIFIED_USER" && p.role !== "SUPER_ADMIN" && (
                                    <Button size="sm" variant="outline" onClick={() => confirmAction("Unverify User", "Demote to UNVERIFIED_USER?", () => mutateUser.mutate({ userId: p.id, role: "UNVERIFIED_USER" }))} className="text-orange-500">Unverify</Button>
                                  )}
                                  
                                  {user?.role === "SUPER_ADMIN" && p.role !== "SUPER_ADMIN" && (
                                    p.role === "ADMIN" ? (
                                      <Button size="sm" variant="destructive" onClick={() => confirmAction("Demote Admin", "Remove ADMIN rights?", () => mutateUser.mutate({ userId: p.id, role: "USER" }))}>Demote Admin</Button>
                                    ) : (
                                      <Button size="sm" variant="default" onClick={() => confirmAction("Promote to Admin", "Grant ADMIN rights?", () => mutateUser.mutate({ userId: p.id, role: "ADMIN" }))}>Make Admin</Button>
                                    )
                                  )}
                                </div>`;

adminCode = adminCode.replace(actionsOriginal, actionsNew);

fs.writeFileSync('src/pages/Admin.tsx', adminCode);
console.log('Patched Admin.tsx');
