-- Registry profile cleanup — June 2026
-- Bulk update of x_handle, website, and symbol for Bankr-linked agents.
-- Source: Luca research pass against live Bankr profiles + X verification.
-- Run in Supabase SQL editor (or via admin migration runner).
-- Only rows that exist in registry_agents will be updated — no inserts.

-- ── X handle corrections ──────────────────────────────────────────────────────
-- Replace founder/personal handles with confirmed project accounts.

UPDATE registry_agents SET x_handle = '@KellyClaudeAI',  updated_at = now() WHERE name = 'KellyClaude';
UPDATE registry_agents SET x_handle = '@miroshark_',      updated_at = now() WHERE name = 'MiroShark';
UPDATE registry_agents SET x_handle = '@moltbook',        updated_at = now() WHERE name = 'Moltbook';
UPDATE registry_agents SET x_handle = '@litcoin_AI',      updated_at = now() WHERE name = 'LITCOIN Research Protocol';
UPDATE registry_agents SET x_handle = '@JunoAgent',       updated_at = now() WHERE name = 'Juno Agent';
UPDATE registry_agents SET x_handle = '@OrlixAI',         updated_at = now() WHERE name = 'Orlix AI';
UPDATE registry_agents SET x_handle = '@helixaxyz',       updated_at = now() WHERE name = 'Helixa';
UPDATE registry_agents SET x_handle = '@HermesOneApp',    updated_at = now() WHERE name = 'Hermes Desktop';
UPDATE registry_agents SET x_handle = '@morvlabs',        updated_at = now() WHERE name = 'Morv Labs';
UPDATE registry_agents SET x_handle = '@blueagent_',      updated_at = now() WHERE name = 'Blue Agent';
UPDATE registry_agents SET x_handle = '@pmfi_cc',         updated_at = now() WHERE name = 'PMFI';
UPDATE registry_agents SET x_handle = '@tryskopos',       updated_at = now() WHERE name = 'Skopos';
UPDATE registry_agents SET x_handle = '@Starchild_app',   updated_at = now() WHERE name = 'Starchild';
UPDATE registry_agents SET x_handle = '@mferGPT',         updated_at = now() WHERE name = 'mferGPT';
UPDATE registry_agents SET x_handle = '@perk_os',         updated_at = now() WHERE name = 'PerkOS';
UPDATE registry_agents SET x_handle = '@0_x_coral',       updated_at = now() WHERE name = 'Coral';
UPDATE registry_agents SET x_handle = '@saimmybot',       updated_at = now() WHERE name = 'saimmy';
UPDATE registry_agents SET x_handle = '@MineBotcoin',     updated_at = now() WHERE name = 'BOTCOIN';
UPDATE registry_agents SET x_handle = '@TheHivemindOS',   updated_at = now() WHERE name = 'HIVE';
UPDATE registry_agents SET x_handle = '@HivraOS',         updated_at = now() WHERE name = 'HermesOS';
UPDATE registry_agents SET x_handle = '@yoshizenco',      updated_at = now() WHERE name = 'Yoshi';
UPDATE registry_agents SET x_handle = '@myk_clawd',       updated_at = now() WHERE name = 'mykclawd';
UPDATE registry_agents SET x_handle = '@revaultdrops',    updated_at = now() WHERE name = 'ReVault Intelligence';
UPDATE registry_agents SET x_handle = '@CuvaAIxyz',       updated_at = now() WHERE name = 'CUVA AI';
UPDATE registry_agents SET x_handle = '@Charon_AI',       updated_at = now() WHERE name = 'CHARON';
UPDATE registry_agents SET x_handle = '@AzzleAI',         updated_at = now() WHERE name = 'Azzle';
UPDATE registry_agents SET x_handle = '@polygraphso',     updated_at = now() WHERE name = 'Polygraph';
UPDATE registry_agents SET x_handle = '@ProteanLabs_',    updated_at = now() WHERE name = 'Protean';
UPDATE registry_agents SET x_handle = '@aeoncityhub',     updated_at = now() WHERE name = 'Aeon City';

-- ── Website additions ─────────────────────────────────────────────────────────

UPDATE registry_agents SET website = 'https://iamkelly.ai',              updated_at = now() WHERE name = 'KellyClaude';
UPDATE registry_agents SET website = 'https://www.miroshark.xyz',        updated_at = now() WHERE name = 'MiroShark';
UPDATE registry_agents SET website = 'https://moltbook.com',             updated_at = now() WHERE name = 'Moltbook';
UPDATE registry_agents SET website = 'https://litcoin.app/',             updated_at = now() WHERE name = 'LITCOIN Research Protocol';
UPDATE registry_agents SET website = 'https://zhcinstitute.com',         updated_at = now() WHERE name = 'Juno Agent';
UPDATE registry_agents SET website = 'https://www.axobotl.ai/',          updated_at = now() WHERE name = 'Axobotl';
UPDATE registry_agents SET website = 'https://helixa.xyz',               updated_at = now() WHERE name = 'Helixa';
UPDATE registry_agents SET website = 'https://hermesone.org',            updated_at = now() WHERE name = 'Hermes Desktop';
UPDATE registry_agents SET website = 'https://morv.run',                 updated_at = now() WHERE name = 'Morv Labs';
UPDATE registry_agents SET website = 'https://blueagent.dev',            updated_at = now() WHERE name = 'Blue Agent';
UPDATE registry_agents SET website = 'https://pmfi.cc',                  updated_at = now() WHERE name = 'PMFI';
UPDATE registry_agents SET website = 'https://www.tryskopos.xyz',        updated_at = now() WHERE name = 'Skopos';
UPDATE registry_agents SET website = 'https://www.starchild.software/',  updated_at = now() WHERE name = 'Starchild';
UPDATE registry_agents SET website = 'https://clawdbotatg.eth.link/',    updated_at = now() WHERE name = 'CLAWD';
UPDATE registry_agents SET website = 'https://www.clawharbor.work/',     updated_at = now() WHERE name = 'Claw Harbor';
UPDATE registry_agents SET website = 'https://perkos.xyz/',              updated_at = now() WHERE name = 'PerkOS';
UPDATE registry_agents SET website = 'https://www.clawfable.com/',       updated_at = now() WHERE name = 'AntiHunter';
UPDATE registry_agents SET website = 'https://0xcoral.com',              updated_at = now() WHERE name = 'Coral';
UPDATE registry_agents SET website = 'https://www.thegitcity.com/',      updated_at = now() WHERE name = 'GITCITY';
UPDATE registry_agents SET website = 'https://ethresear.ch/',            updated_at = now() WHERE name = 'ethresearchbot';
UPDATE registry_agents SET website = 'https://openagent.market',         updated_at = now() WHERE name = 'openagentmarket';
UPDATE registry_agents SET website = 'https://basir.ai',                 updated_at = now() WHERE name = 'Basir';
UPDATE registry_agents SET website = 'https://aaigotchi.app/',           updated_at = now() WHERE name = 'AAI';
UPDATE registry_agents SET website = 'https://agentmcclaw.com/',         updated_at = now() WHERE name = 'Agent McClaw';
UPDATE registry_agents SET website = 'https://fromearendel.com',         updated_at = now() WHERE name = 'Earendel';
UPDATE registry_agents SET website = 'https://builderscout.ai/',         updated_at = now() WHERE name = 'BuilderScout';
UPDATE registry_agents SET website = 'https://saimmy.com',               updated_at = now() WHERE name = 'saimmy';
UPDATE registry_agents SET website = 'https://botcoin.money',            updated_at = now() WHERE name = 'BOTCOIN';
UPDATE registry_agents SET website = 'https://hermesos.cloud',           updated_at = now() WHERE name = 'HermesOS';
UPDATE registry_agents SET website = 'https://yoshizen.co',              updated_at = now() WHERE name = 'Yoshi';
UPDATE registry_agents SET website = 'https://mykclawd.xyz',             updated_at = now() WHERE name = 'mykclawd';
UPDATE registry_agents SET website = 'https://www.cuvaai.xyz/',          updated_at = now() WHERE name = 'CUVA AI';
UPDATE registry_agents SET website = 'https://www.azzle.org/',           updated_at = now() WHERE name = 'Azzle';
UPDATE registry_agents SET website = 'https://www.polygraph.so/',        updated_at = now() WHERE name = 'Polygraph';
UPDATE registry_agents SET website = 'https://www.protean.sh/',          updated_at = now() WHERE name = 'Protean';
UPDATE registry_agents SET website = 'https://orlixai.xyz',              updated_at = now() WHERE name = 'Orlix AI';

-- ── Ticker / symbol additions ─────────────────────────────────────────────────

UPDATE registry_agents SET symbol = '$ORLIX',       updated_at = now() WHERE name = 'Orlix AI';
UPDATE registry_agents SET symbol = '$HD',          updated_at = now() WHERE name = 'Hermes Desktop';
UPDATE registry_agents SET symbol = '$MORV',        updated_at = now() WHERE name = 'Morv Labs';
UPDATE registry_agents SET symbol = '$PMFI',        updated_at = now() WHERE name = 'PMFI';
UPDATE registry_agents SET symbol = '$SKOPOS',      updated_at = now() WHERE name = 'Skopos';
UPDATE registry_agents SET symbol = '$AEONCITY',    updated_at = now() WHERE name = 'Aeon City';
UPDATE registry_agents SET symbol = '$HIVE',        updated_at = now() WHERE name = 'HIVE';
UPDATE registry_agents SET symbol = '$YOSHI',       updated_at = now() WHERE name = 'Yoshi';
UPDATE registry_agents SET symbol = '$MYKCLAWD',    updated_at = now() WHERE name = 'mykclawd';
UPDATE registry_agents SET symbol = '$RVAULT',      updated_at = now() WHERE name = 'ReVault Intelligence';
UPDATE registry_agents SET symbol = '$CUVA',        updated_at = now() WHERE name = 'CUVA AI';
UPDATE registry_agents SET symbol = '$CHARON',      updated_at = now() WHERE name = 'CHARON';
UPDATE registry_agents SET symbol = '$AZL',         updated_at = now() WHERE name = 'Azzle';
UPDATE registry_agents SET symbol = '$POLYGRAPH',   updated_at = now() WHERE name = 'Polygraph';
UPDATE registry_agents SET symbol = '$PRTN',        updated_at = now() WHERE name = 'Protean';
UPDATE registry_agents SET symbol = '$BOTCOIN',     updated_at = now() WHERE name = 'BOTCOIN';
UPDATE registry_agents SET symbol = '$MYKCLAWD',    updated_at = now() WHERE name = 'mykclawd';

-- ── Intentionally left blank (unresolved / weak evidence) ────────────────────
-- HyperClaw, Robot Money website/ticker, Atlas Forge website,
-- AmberVibe website, FELIX website, BankrSynth website, ToruCEO website,
-- Clawlinker website, Clawvatar website, nanopay website, Ghost website,
-- Singularity Engine website (GitHub only), TeliGent, Teddy, Revenant AI,
-- Prim website — do not write these until confirmed from a clean source.
