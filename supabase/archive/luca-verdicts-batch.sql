-- ARCHIVED 2026-07-06: superseded by supabase/migrations/. DO NOT APPLY.
-- See supabase/README.md for migration instructions.

-- Luca verdicts batch update — 30 agents
-- Paste into Supabase SQL editor and run

UPDATE registry_agents SET
  admin_notes = 'Bankr has real ecosystem gravity. Public docs show agent wallets, token launches, and creator fee rails on Base, which is stronger than narrative-only projects. Treasury visibility is still incomplete from public data, so the activity is clear but the books are not.',
  financial_activity_score = 84,
  partnership_fit_score = 93,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'Bankr';

UPDATE registry_agents SET
  admin_notes = 'Virtuals is one of the clearest agent-economy coordination layers with visible tokenized-agent activity and strong ecosystem position. The problem is attribution: lots of movement, but treasury truth depends on which wallet belongs to protocol, agent, creator, or token community.',
  financial_activity_score = 88,
  partnership_fit_score = 95,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'Virtuals Protocol';

UPDATE registry_agents SET
  admin_notes = 'Clanker looks financially real as infrastructure. Public positioning around token launches, fee rewards, and Base volume suggests meaningful economic throughput, but that does not automatically reveal protocol treasury health.',
  financial_activity_score = 82,
  partnership_fit_score = 91,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'Clanker';

UPDATE registry_agents SET
  admin_notes = 'Gitlawb has one of the cleaner public financial surfaces in this list: active product identity, public token activity, and visible ecosystem engagement. Good signal, but the token contract is still not the same thing as a verified treasury wallet.',
  financial_activity_score = 86,
  partnership_fit_score = 96,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'Gitlawb';

UPDATE registry_agents SET
  admin_notes = 'Autonolas is a serious agent-infrastructure project with a visible token and durable market presence. The ecosystem position is strong, but public treasury attribution is still looser than the narrative strength.',
  financial_activity_score = 79,
  partnership_fit_score = 90,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'Autonolas';

UPDATE registry_agents SET
  admin_notes = 'Primer looks early but relevant, especially with public x402 hackathon positioning. I see product intent more than mature financial signal, so this reads like an emerging operator rather than a proven treasury story.',
  financial_activity_score = 42,
  partnership_fit_score = 78,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'Primer Systems';

UPDATE registry_agents SET
  admin_notes = 'AgentKit is strategically important, but it is a toolkit, not an agent treasury in the usual sense. Strong partnership fit, weak direct treasury visibility, and financial activity should be read through adoption rather than token movement.',
  financial_activity_score = 55,
  partnership_fit_score = 98,
  treasury_health = 'Healthy',
  last_checked = '2026-05'
WHERE name = 'Coinbase AgentKit';

UPDATE registry_agents SET
  admin_notes = 'OpenGradient has visible token market activity and clear positioning around AI-native financial infrastructure. That is a good start, but public wallet-role clarity still looks thin, so I would not overstate treasury confidence.',
  financial_activity_score = 74,
  partnership_fit_score = 86,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'OpenGradient';

UPDATE registry_agents SET
  admin_notes = 'The token has visible market activity and the product has a credible API-access model, but there is still a big gap between token trading and a legible operating treasury.',
  financial_activity_score = 76,
  partnership_fit_score = 80,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'Venice';

UPDATE registry_agents SET
  admin_notes = 'aixbt has visible token liquidity and public brand recognition. But most public signal still looks market-facing first, business-attribution second, so treasury clarity remains limited.',
  financial_activity_score = 78,
  partnership_fit_score = 74,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'aixbt';

UPDATE registry_agents SET
  admin_notes = 'Freysa is one of the more visible AI-agent brands, with live token markets and strong public mindshare. The visibility is real; the treasury picture is still harder to prove from public data alone.',
  financial_activity_score = 81,
  partnership_fit_score = 84,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'Freysa';

UPDATE registry_agents SET
  admin_notes = 'ElizaOS has strong ecosystem relevance, open-source credibility, and visible token market activity. The project matters, but public treasury evidence is still less clean than the social footprint.',
  financial_activity_score = 77,
  partnership_fit_score = 89,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'ElizaOS';

UPDATE registry_agents SET
  admin_notes = 'GAME has obvious ecosystem importance inside the Virtuals stack and a public token market. Financial activity appears real at the market layer, but treasury attribution is still mostly indirect.',
  financial_activity_score = 80,
  partnership_fit_score = 90,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'GAME by Virtuals';

UPDATE registry_agents SET
  admin_notes = 'There is public token activity and a known agent narrative, but the financial picture still leans more entertainment and speculation than clean treasury accounting.',
  financial_activity_score = 68,
  partnership_fit_score = 75,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'LUNA';

UPDATE registry_agents SET
  admin_notes = 'x402 is highly important infrastructure, but it is a protocol standard, not a normal treasury-bearing agent. Partnership fit is extremely high; direct financial scoring is lower only because public protocol usage does not automatically expose a treasury.',
  financial_activity_score = 58,
  partnership_fit_score = 99,
  treasury_health = 'Healthy',
  last_checked = '2026-05'
WHERE name = 'x402';

UPDATE registry_agents SET
  admin_notes = 'Aeon has solid public signals: framework identity, Base/Bankr token visibility, and meaningful fee-proxy activity. The activity looks real enough to track, but wallet-role verification is still missing.',
  financial_activity_score = 83,
  partnership_fit_score = 88,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'Aeon';

UPDATE registry_agents SET
  admin_notes = 'Public evidence shows investment activity, but not enough clean, agent-specific financial evidence to treat it like a transparent treasury case.',
  financial_activity_score = 39,
  partnership_fit_score = 52,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'EZ Labs';

UPDATE registry_agents SET
  admin_notes = 'Ethy looks like a real Virtuals-linked trading agent with a live token and Base app presence. That is stronger than pure concept-stage agents, but public evidence still says more about token activity than audited operating results.',
  financial_activity_score = 73,
  partnership_fit_score = 83,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'Ethy';

UPDATE registry_agents SET
  admin_notes = 'Xyber positioning around ownership rails for agents and intelligent commerce is strong. Financially, it still reads like emerging infrastructure with more product ambition than public treasury legibility.',
  financial_activity_score = 57,
  partnership_fit_score = 87,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'Xyber';

UPDATE registry_agents SET
  admin_notes = 'FractionAI looks commercially serious, but the public signal leans more toward thought leadership and product positioning than onchain treasury evidence. Good partnership case, weaker direct financial visibility.',
  financial_activity_score = 49,
  partnership_fit_score = 82,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'FractionAI';

UPDATE registry_agents SET
  admin_notes = 'Multiple Otto projects exist in public. I found product surfaces and token references, but the identity overlap makes the financial picture unreliable without a confirmed official handle or wallet.',
  financial_activity_score = 44,
  partnership_fit_score = 60,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'Otto AI';

UPDATE registry_agents SET
  admin_notes = 'Sibyl has a clearer Base-native agent identity than many smaller names here, plus a token and public positioning around early-stage crypto discovery. Still, the treasury side is not yet clean enough to call strong.',
  financial_activity_score = 62,
  partnership_fit_score = 77,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'Sibyl';

UPDATE registry_agents SET
  admin_notes = 'Elsa has a live token market and a product story around AI-powered onchain execution. That gives it real financial signal, but public data still shows market activity more clearly than treasury discipline.',
  financial_activity_score = 71,
  partnership_fit_score = 79,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'Elsa';

UPDATE registry_agents SET
  admin_notes = 'Helixa matters because identity and reputation are upstream of agent finance. Public token and Bankr profile signals exist, but the treasury picture is still thin and should be treated cautiously.',
  financial_activity_score = 61,
  partnership_fit_score = 90,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'Helixa';

UPDATE registry_agents SET
  admin_notes = 'PeptAI is one of the more interesting cases because the public story includes machine-to-machine payments, x402 references, and agent coordination in a DeSci workflow. Good signal, but it is still early and treasury verification remains incomplete.',
  financial_activity_score = 69,
  partnership_fit_score = 91,
  treasury_health = 'Watch',
  last_checked = '2026-05'
WHERE name = 'PeptAI';

UPDATE registry_agents SET
  admin_notes = 'Public evidence suggests BorrowGuard is tied to the Bankr ecosystem, but identity quality is still weak. Treated as a monitored sub-ecosystem candidate, not a clean standalone treasury profile yet.',
  financial_activity_score = 46,
  partnership_fit_score = 72,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'BorrowGuard';

UPDATE registry_agents SET
  admin_notes = 'The concept fits Luca well — deployment standards, audit reports, evidence trails — but public financial activity still looks early.',
  financial_activity_score = 51,
  partnership_fit_score = 88,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'Modulr';

UPDATE registry_agents SET
  admin_notes = 'AgentCash has one of the clearest commerce narratives here: x402 payments, API access, and agent spending infrastructure. That is good financial plumbing, but more wallet evidence is needed before calling treasury health strong.',
  financial_activity_score = 72,
  partnership_fit_score = 95,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'AgentCash';

UPDATE registry_agents SET
  admin_notes = 'ChainWard focuses on Base wallet monitoring and operational alerts, which is directly relevant to Luca. The strategic fit is strong; the public treasury surface is still early and more product-led than balance-sheet-led.',
  financial_activity_score = 54,
  partnership_fit_score = 93,
  treasury_health = 'Pending',
  last_checked = '2026-05'
WHERE name = 'ChainWard';

UPDATE registry_agents SET
  admin_notes = 'Nookplot has meaningful public token activity, active ecosystem messaging, and a strong coordination narrative. Good signal, but the market can see the token more easily than the books, so wallet-role clarity is still the missing piece.',
  financial_activity_score = 81,
  partnership_fit_score = 89,
  treasury_health = 'Stable',
  last_checked = '2026-05'
WHERE name = 'Nookplot';
