# Bankr Agent Data Audit — 2026-07-16

Generated: 2026-07-16T10:33:12.461Z
Source: Supabase (live) · Manifest lookup: ok

Note: no `bio` column exists in the registry — the Bio column below is an
admin-notes-presence proxy. "Complete metadata" is the strict check
(X + website + ticker + token address), stricter than the stored metadata_status tag.

## Summary

| Metric | Count |
|---|---|
| Total Bankr agents indexed | 143 |
| Complete metadata (strict) | 64 |
| Missing X handle | 7 |
| Missing website | 54 |
| Missing token ticker | 19 |
| Missing token address | 54 |
| Wallets declared | 12 |
| Wallets verified | 1 |
| Live books | 6 |
| Stale books | 0 |
| No books | 137 |
| Books pending (extra, not in spec 13) | 0 |
| Books error (extra, not in spec 13) | 0 |
| Needs review | 0 |
| Duplicates | 9 |

## Duplicates

| Type | Value | Agents |
|---|---|---|
| x_handle | `wakeonbase` | wake, wake |
| x_handle | `coinbasedev` | x402, coinbase-agentkit |
| x_handle | `virtuals_io` | virtuals-protocol, game-by-virtuals, luna |
| x_handle | `gitlawb` | gitlawb, openclaude |

## Action buckets

### Usable — books can generate now (3)

luca, aeon, skopos

### Books ready (already generated) (6)

luca, aeon, atrium-hermes, nipmod, sleuth-ai, skopos

### Needs manifest (8)

basemate, harbor, clawmax, stealf-labs, gittellr, noelclaw, surplus-intelligence, ratspeak

### Needs metadata cleanup (79)

wake, mei, nullsec, root, ribbita, checker, delu, supergemma, mythos, vigil, zbase, darksol, grantr, halo, zer0, atrium-hermes, x402, gitbank, bankr, payai-network, agent-tresor, clanker, nipmod, shush-protocol, game-by-virtuals, autonolas, unibase, harbor, primer-systems, coinbase-agentkit, elizaos, scales-finance, maxagents-ai, clawmax, opengradient, borrowguard, felix, bankrsynth, stealf-labs, ez-labs, gittellr, modulr, ethy, agentcash, venice, aixbt, chainward, fractionai, xyber, peptai, starchild, openclaude, sleuth-ai, otto-ai, sibyl, elsa, aeon-city, mfergpt, atlas-forge, freysa, wake, robot-money, ambervibe, hyperclaw, toruceo, noelclaw, surplus-intelligence, ratspeak, test, clawlinker, clawvatar, nanopay, ghost, singularity-engine, teligent, teddy, revenant-ai, zer0, prim

## Full per-agent detail

| Name | Slug | Bio | X | Website | Ticker | Token Addr | Bankr Profile | Wallets (manifest/eligible) | Manifest | Wallet | Books | Profile | Data | Flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| wake | wake | ✓ | @wakeonbase | ✗ | $wake | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | duplicate(x_handle) |
| MEI | mei | ✓ | @meimighty1 | ✗ | $MEI | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Nullsec | nullsec | ✓ | @trynullsec | ✓ | $NSEC | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Root | root | ✓ | @root_edge | ✓ | $rootAI | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Ribbita | ribbita | ✓ | @ribbita2012 | ✗ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Checker | checker | ✓ | @checkrsocial | ✓ | $checkr | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Delu | delu | ✓ | @deluquant | ✗ | $delu | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| SUPERGEMMA | supergemma | ✓ | ✗ | ✗ | $SUPERGEMMA | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| MYTHOS | mythos | ✓ | ✗ | ✗ | $MYTHOS | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Vigil | vigil | ✓ | @vigilcodes | ✗ | $Vigil | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| zBase | zbase | ✓ | @zbase__ | ✗ | $zBase | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Darksol | darksol | ✓ | @darks0l_ | ✗ | $darksol | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Grantr | grantr | ✓ | @grantr_id | ✗ | $grantr | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| HALO | halo | ✓ | @hirehalo | ✗ | $HALO | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| zer0 | zer0 | ✓ | ✗ | ✗ | $zer0 | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Luca | luca | ✓ | @AskLucaAI | ✓ | $LUCA | ✓ | ✗ | 2 (2/2) | not_submitted | declared | live | verified | partial | — |
| Aeon | aeon | ✓ | @aeonframework | ✓ | $AEON | ✓ | ✓ | 2 (2/2) | not_submitted | verified | live | verified | stale | — |
| Atrium Hermes | atrium-hermes | ✓ | @atriumhermes | ✓ | $ATRIUM | ✗ | ✗ | 1 (1/1) | not_submitted | declared | live | candidate | stale | — |
| x402 | x402 | ✓ | @CoinbaseDev | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | duplicate(x_handle) |
| Gitbank | gitbank | ✓ | @Gitbank_io | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Bankr | bankr | ✓ | @bankrbot | ✓ | $BNKR | ✗ | ✗ | 1 (1/0) | not_submitted | declared | no_books | needs_verification | partial | — |
| Virtuals Protocol | virtuals-protocol | ✓ | @virtuals_io | ✓ | $VIRTUAL | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | needs_verification | partial | duplicate(x_handle) |
| PayAI Network | payai-network | ✓ | @PayAINetwork | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Agent Tresor | agent-tresor | ✓ | @AgentTresor | ✗ | $AGTR | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Veilnet | veilnet | ✓ | @Veilnet_ | ✓ | $VEILNET | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Clanker | clanker | ✓ | @clanker_world | ✓ | $CLANK | ✗ | ✗ | 1 (1/0) | not_submitted | declared | no_books | candidate | partial | — |
| Manfred Macx | manfred-macx | ✓ | @clawbankco | ✓ | $CLAWBANK | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Gitlawb | gitlawb | ✓ | @gitlawb | ✓ | $GITLAWB | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | needs_verification | stale | duplicate(x_handle) |
| Omega Layer | omega-layer | ✓ | @x402_Omega | ✓ | $OMG | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| MiroShark | miroshark | ✓ | @miroshark_ | ✓ | $MIROSHARK | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Nipmod | nipmod | ✓ | ✗ | ✓ | $NPM | ✗ | ✗ | 2 (1/1) | not_submitted | declared | live | needs_verification | stale | — |
| BaseMate | basemate | ✓ | @basemateagent | ✓ | $BAS | ✓ | ✗ | 2 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| Shush Protocol | shush-protocol | ✓ | @Excubialabs | ✗ | $SHUSH | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| GAME by Virtuals | game-by-virtuals | ✓ | @virtuals_io | ✓ | $GAME | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | duplicate(x_handle) |
| BOTCOIN | botcoin | ✓ | @MineBotcoin | ✓ | $BOTCOIN | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| CLAWD | clawd | ✓ | @clawdbotatg | ✓ | $CLAWD | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Autonolas | autonolas | ✓ | @autonolas | ✓ | $OLAS | ✗ | ✗ | 1 (1/0) | not_submitted | declared | no_books | candidate | partial | — |
| Unibase | unibase | ✓ | @Unibase_AI | ✗ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Moltbook | moltbook | ✓ | @moltbook | ✓ | $MOLT | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Harbor | harbor | ✓ | @Tryharbor_Ai | ✗ | $HARBOR | ✓ | ✗ | 1 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| Primer Systems | primer-systems | ✓ | @primer_systems | ✓ | $PR | ✗ | ✗ | 1 (1/0) | not_submitted | declared | no_books | needs_verification | partial | — |
| Coinbase AgentKit | coinbase-agentkit | ✓ | @CoinbaseDev | ✗ | ✗ | ✗ | ✗ | 1 (1/0) | not_submitted | declared | no_books | candidate | partial | duplicate(x_handle) |
| ElizaOS | elizaos | ✓ | @elizaOS | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Scales Finance | scales-finance | ✓ | @ScalesFinance | ✗ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| LITCOIN Research Protocol | litcoin-research-protocol | ✓ | @litcoin_AI | ✓ | $LITCOIN | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| MaxAgents.ai | maxagents-ai | ✓ | @MaxAgentsai_ | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| KellyClaude | kellyclaude | ✓ | @KellyClaudeAI | ✓ | $KellyClaude | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Clawmax | clawmax | ✓ | @OpenClawmax | ✗ | $CMAX | ✓ | ✗ | 1 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| Juno Agent | juno-agent | ✓ | @JunoAgent | ✓ | $JUNO | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Nookplot | nookplot | ✓ | @nookplot | ✓ | $NOOK | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | needs_verification | stale | — |
| OpenGradient | opengradient | ✓ | @OpenGradient | ✓ | $OPG | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| BorrowGuard | borrowguard | ✓ | @0X_BankrGuard | ✗ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| FELIX | felix | ✓ | @nateliason | ✗ | $FELIX | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Axobotl | axobotl | ✓ | @Inner_Axiom | ✓ | $AXOBOTL | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| BankrSynth | bankrsynth | ✓ | @bankrsynth | ✗ | $SYNTH | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Stealf Labs | stealf-labs | ✓ | @stealf_labs | ✗ | $STEALF | ✓ | ✗ | 1 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| EZ Labs | ez-labs | ✓ | @ezlabsbuild | ✗ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Gittellr | gittellr | ✓ | @Gittellrbot | ✓ | ✗ | ✗ | ✗ | 1 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| Helixa | helixa | ✓ | @helixaxyz | ✓ | $CRED | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Modulr | modulr | ✓ | @Modulr402 | ✗ | $MODU | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | needs_verification | partial | — |
| Orlix AI | orlix-ai | ✓ | @OrlixAI | ✓ | $ORLIX | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Ethy | ethy | ✓ | @ethy_agent | ✗ | $ETHY | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| AgentCash | agentcash | ✓ | @agentcashdev | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Venice | venice | ✓ | @AskVenice | ✗ | $VVV | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Doppel | doppel | ✓ | @doppelfun | ✓ | $DOPPEL | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Hermes Desktop | hermes-desktop | ✓ | @HermesOneApp | ✓ | $HD | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| aixbt | aixbt | ✓ | @aixbt_agent | ✓ | $AIXBT | ✗ | ✗ | 1 (1/0) | not_submitted | declared | no_books | candidate | partial | — |
| ChainWard | chainward | ✓ | @chainwardai | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Morv Labs | morv-labs | ✓ | @morvlabs | ✓ | $MORV | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| 0xAgentEVE | 0xagenteve | ✓ | @0xAgentEVE | ✓ | $EVE | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Do Browser | do-browser | ✓ | @do_browser | ✓ | Do | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Blue Agent | blue-agent | ✓ | @blueagent_ | ✓ | $BLUEAGENT | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| FractionAI | fractionai | ✓ | @FractionAI_xyz | ✗ | $FRAC | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Xyber | xyber | ✓ | @Xyberinc | ✗ | $XYBER | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| PeptAI | peptai | ✓ | @peptai_ | ✗ | $PEPT | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Starchild | starchild | ✓ | @Starchild_app | ✓ | ✗ | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| OpenClaude | openclaude | ✓ | @gitlawb | ✓ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | duplicate(x_handle) |
| Sleuth AI | sleuth-ai | ✓ | @sleuth_ai | ✓ | ✗ | ✓ | ✗ | 2 (2/2) | not_submitted | declared | live | needs_verification | partial | — |
| Claw Harbor | claw-harbor | ✓ | @ClawHarbor | ✓ | $HARBOR | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| AionUi | aionui | ✓ | @Aion_Ui | ✓ | aionui | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| PerkOS | perkos | ✓ | @perk_os | ✓ | $PERKOS | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| PMFI | pmfi | ✓ | @pmfi_cc | ✓ | $PMFI | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Skopos | skopos | ✓ | @tryskopos | ✓ | $SKOPOS | ✓ | ✗ | 1 (1/1) | not_submitted | declared | live | verified | partial | — |
| AntiHunter | antihunter | ✓ | @AntiHunterAI | ✓ | $ANTIHUNTER | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| LUNA | luna | ✓ | @virtuals_io | ✓ | $LUNA | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | duplicate(x_handle) |
| Otto AI | otto-ai | ✓ | @useOttoAI | ✗ | $OTTO | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Coral | coral | ✓ | @0_x_coral | ✓ | $CORAL | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| HIVE | hive | ✓ | @TheHivemindOS | ✓ | $HIVE | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| CUVA AI | cuva-ai | ✓ | @CuvaAIxyz | ✓ | $CUVA | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Aleister | aleister | ✓ | @aleisterai | ✓ | $ALEISTER | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Sibyl | sibyl | ✓ | @sibylcap | ✗ | $SIBYL | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Elsa | elsa | ✓ | @HeyElsaAI | ✗ | $ELSA | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| CHARON | charon | ✓ | @Charon_AI | ✓ | $CHARON | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Tachikoma | tachikoma | ✓ | @smolemaru | ✓ | $TACHI | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Yoshi | yoshi | ✓ | @yoshizenco | ✓ | $YOSHI | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| HermesOS | hermesos | ✓ | @HivraOS | ✓ | $HermesOS | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Azzle | azzle | ✓ | @AzzleAI | ✓ | $AZL | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| molty.cash | molty-cash | ✓ | @moltycash | ✓ | $MOLTYCASH | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Aeon City | aeon-city | ✓ | @aeoncityhub | ✗ | $AEONCITY | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| mferGPT | mfergpt | ✓ | @mferGPT | ✗ | $MFERGPT | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| ReVault Intelligence | revault-intelligence | ✓ | @revaultdrops | ✓ | $RVAULT | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| GITCITY | gitcity | ✓ | @samuelrizzondev | ✓ | $GITC | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Atlas Forge | atlas-forge | ✓ | @AtlasForgeAI | ✗ | $ATLASFORGE | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Polygraph | polygraph | ✓ | @polygraphso | ✓ | $POLYGRAPH | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Freysa | freysa | ✓ | @freysa_ai | ✗ | $FAI | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Wake | wake | ✓ | @wakeonbase | ✗ | $wake | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | duplicate(x_handle) |
| Robot Money | robot-money | ✓ | @LexSokolin | ✗ | ✗ | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| AmberVibe | ambervibe | ✓ | @HelloBenWhite | ✗ | $AMBERVIBE | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Protean | protean | ✓ | @ProteanLabs_ | ✓ | $PRTN | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| stakrbot | stakrbot | ✓ | @xwickD | ✓ | $STAKR | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| ethresearchbot | ethresearchbot | ✓ | @ethresearchbot | ✓ | $ETHR | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| openagentmarket | openagentmarket | ✓ | @applefather_eth | ✓ | $OAM | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Basir | basir | ✓ | @basir_ai | ✓ | $BASIR | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| mykclawd | mykclawd | ✓ | @myk_clawd | ✓ | $MYKCLAWD | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| HyperClaw | hyperclaw | ✓ | ✗ | ✗ | $HCLAW | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| AAI | aai | ✓ | @aaigotchi | ✓ | $AAI | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| ToruCEO | toruceo | ✓ | @ToruCeoAI | ✗ | $TORUCEO | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Agent McClaw | agent-mcclaw | ✓ | @AgentMcClaw | ✓ | $MCCLAW | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Earendel | earendel | ✓ | @FromEarendel | ✓ | $EARENDEL | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Noelclaw | noelclaw | ✓ | @noelclawfun | ✗ | $Noelclaw | ✗ | ✗ | 1 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| Surplus Intelligence | surplus-intelligence | ✓ | @asksurplus | ✓ | $SURPLUS | ✗ | ✗ | 1 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| Ratspeak | ratspeak | ✓ | @ratspeakorg | ✓ | $ratspeak | ✗ | ✗ | 1 (0/0) | not_submitted | rejected | no_books | candidate | stale | — |
| Test | test | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| BuilderScout | builderscout | ✓ | @BuilderScout | ✓ | $SCOUT | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Clawlinker | clawlinker | ✓ | @clawlinker | ✗ | $CLAWLINKER | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Clawvatar | clawvatar | ✓ | @clawvatar | ✗ | $CLAWVATAR | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| ForgeOracle | forgeoracle | ✓ | @mythosforgebot | ✓ | $FORGE | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| nanopay | nanopay | ✓ | @nanopay_ | ✗ | $NANO | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Perpetual Keeper | perpetual-keeper | ✓ | @0xKeeperAgent | ✓ | $KEEPER | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| saimmy | saimmy | ✓ | @saimmybot | ✓ | $SAIMMY | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Lexispawn | lexispawn | ✓ | @lexispawn | ✓ | $SPAWN | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Ghost | ghost | ✓ | @clawdbot67 | ✗ | $GHOST | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Singularity Engine | singularity-engine | ✓ | @metatransformr | ✗ | $SINGULARITY | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| TeliGent | teligent | ✓ | @Teli_Gent_ | ✗ | $TELI | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| MoltRooms | moltrooms | ✓ | @codedontrack | ✓ | $ROOM | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Teddy | teddy | ✓ | @IamTeddyAI | ✗ | $TEDDY | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Revenant AI | revenant-ai | ✓ | @RevAI_Labs | ✗ | $RVNT | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| ConAudits Agent | conaudits-agent | ✓ | @conaudits | ✓ | $CON+ | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Zer0 | zer0 | ✓ | ✗ | ✗ | $zer0 | ✗ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | stale | — |
| Prim | prim | ✓ | @prim402 | ✗ | $PRIM | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Agent Remilia | agent-remilia | ✓ | @agentRemilia | ✓ | $REMILIA | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Daily Haiku Bot | daily-haiku-bot | ✓ | @0xHaikuBot | ✓ | $HAIKU | ✓ | ✓ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
| Echo | echo | ✗ | @BuiltByEcho | ✓ | $ECHO | ✓ | ✗ | 0 (0/0) | not_submitted | none | no_books | candidate | partial | — |
