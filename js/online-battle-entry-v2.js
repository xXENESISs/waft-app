// Entry helper kept separate so online-battle.js can remain a tiny bootstrap.

import { installOnlineBattleV2 } from "./online-battle-v2-bootstrap.js";

installOnlineBattleV2();

export async function loadLegacyOnlineBattle() {
  return import("./online-battle-legacy.js");
}
