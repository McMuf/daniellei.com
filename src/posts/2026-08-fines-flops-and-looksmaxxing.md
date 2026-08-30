---
title: "Fines, FLOPs, and Looksmaxxing"
date: "2026-08-29"
author: "Daniel Lei"
sector: "Markets & Culture"
summary: "Meta's fine, whether compute is really the new oil, a semiconductor correction, and the business of looksmaxxing. My August 2026 read."
tags: [macro, ai, semiconductors, personal]
---

Hi there, my name is Daniel, an incoming CS + Finance Student @uwaterloo, and I'm passionate about the markets, CS, and lifting. I decided to start this blog to project my thoughts about certain markets and other miscellaneous topics. So join me on this literary journey of mine.

On August 26, Meta agreed to pay up to $16.7–18 billion to settle claims from 29+ states that it knowingly built addictive, harmful products for kids. Its stock rose that day.

## 1. Why Meta's Stock Rose After an $18B Fine

It depended on who you were reading, whether it was Utah's announcement of $12.2 billion or NPR and Axios' $17.1 billion. More importantly, the details about how it would be structured: $12.7 billion (70 percent) will be assured to states for 10 years, while the remaining $5.3 billion (30 percent) will depend on both YouTube and TikTok implementing corresponding changes. Meta is expected to record an accounting expense of $10 billion in Q3 2026 from the settlement. It is the largest consumer protection settlement in decades since the Big Tobacco case, and the one that actually mandates changes to the products themselves, including restricting time spent by users under 18, blocking overnight use, no visible like-counts and beauty filters for children, and the possibility of a non-algorithmic feed.

Counterintuitively, Meta shares rose about 1% that day. Snap, by contrast, fell more than 8%.

Here is my opinion on why the market didn't punish Meta:

- **It's mostly a de-risking event, not a loss.** The trial that just wrapped in Oakland had four states seeking as much as $1.4 trillion. Against that tail-risk number, an $18B settlement is the market breathing a sigh of relief that it didn't go down to the worst possible scenario.
- **Litigation risk was a huge area of debate during each earnings call.** The fact that there is a known and capped cost, no matter how large, means that the analysts can return to analyzing the business itself, which includes revenue growth from ads and AI investment.
- **The market is being selective, not ignoring all aspects related to children's safety.** Snap is facing the same regulatory risk without the diversified revenue stream and balance sheet that Meta has to offset it.

## 2. Is Compute Actually the New Oil?

The consensus among Wall Street is that compute has become a commodity in the sense that it has become as foundational to national power as oil or electricity once was. Every serious AI lab and every government AI strategy, treats raw GPU count as a material resource that can quantify a country's power. There is merit to this claim, considering how Washington classifies exports of Nvidia's Blackwell (B100/B200/GB200) and upcoming Rubin family chips as weapons rather than a matter of regular business.

But I think the more interesting story right now is the counter-argument which is that raw compute access is looking less deterministic than the "new oil" framing.

**Exhibit A: Chinese models are catching up to American ones with only a fraction of the hardware.** DeepSeek's R1 was trained on H800s, which is a China-approved, intentionally weaker model, because H100/H200/Blackwell have been denied to China with a presumption of denial since 2022. Similarly, the Kimi family from Moonshot AI is another example of this trend: Kimi K2.6 has 1 trillion parameters overall, but activates just 32 billion per token using the mix-of-experts architecture; you get cutting-edge performance with significantly reduced inference costs compared to the full-fat model.

Kimi K3 became the top ranker on the Frontend Code Arena leaderboard in July, overtaking Claude Fable 5, as Moonshot achieved an improvement of 2.5 times in efficiency compared to the previous generation not through the increase in the number of chips but due to two new innovations (the hybrid approach to attention and the mechanism of information exchange between the layers). In June 2026, open-source models, mainly Chinese, increased their share of tokens on OpenRouter from 34% to 65%.

**Exhibit B: even Nvidia cannot entirely implement the compute moat.** Chinese companies have already placed orders for over 2 million H200 chips for 2026 while Nvidia's entire stock is only about 700,000 chips — the demand exceeds the supply by 3x even after relaxing the export restrictions, and there was a "Blackwell loophole" (Chinese subsidiaries incorporated in Malaysia, Singapore, or the UAE purchasing chips that do not fall under mainland shipping address restriction) that Commerce blocked in May 2026.

So my stance is that compute is necessary, but it's not sufficient, and it's not the whole moat. The people who are getting more out of less are narrowing the gap with those who have simply got more of the underlying commodity. That's a much more interesting situation than "oil," where a barrel is still a barrel no matter who pumps it.

## 3. Semiconductors: More than meets the eye (and My Pick)

You may have seen headlines about semiconductor ETFs "dropping off." The full picture is a little bit more nuanced than that.

If you look at it from a macro lens, 2026 has been an extraordinary year for the sector. As of August 25, SOXX is up 68.4% YTD and SMH is up 51.8% YTD. That is not a sector in decline.

If you take a closer look, though, there was a bit of a dip in July. SOX had been up 106% YTD before making an all-time high at the end of June and then reversing violently: Micron down 13% in one day ($138B wiped out of market cap), Intel and AMD down 9% and 7%, respectively, and SMH down 5% after recording its best Q2 gain of 71%. The reasons for the reversal, when combined:

- **China DUV lithography advance:** news of China building its own deep ultraviolet lithography equipment en masse freaked out ASML, Lam Research, KLA, Applied Materials, and Entegris especially, re-pricing the likelihood of increased competition in China's manufacturing ecosystem.
- **A memory/HBM shortage** leading to rising prices for DRAM and NAND as manufacturers diverted their production towards server users, away from consumers.
- **Fed hawkishness**, with Iran oil spike driving higher yields

The sector had rallied back by 18% by mid-August from its lows. The global semiconductor sales had yet again touched a new high of $120.6B in May 2026, recording an increase of 104% YOY. So, if you look at it from multiple perspectives it's not a terrible year for the semiconductor industry.

**My pick: GlobalFoundries (GFS)**

I'd assumed GF's bottleneck was expensive New York City rent. This was not correct because GF's HQ and its major fab in the United States are located in Malta, New York, in the Capital Region near Albany, not in New York City. Rent is not the key problem because the capacity of advanced-node fabs in the US is located in only two locations (Malta, New York and Essex Junction, Vermont). For a company trying to position itself as the safe bet for US-made products for auto, aerospace, and defense markets where "not made in a single point of failure" is an important selling point, having a third location would be beneficial for them.

On Global Foundries' valuation, it's a little bit of a mixed bag:

- **Bear/neutral case:** GuruFocus's GF Value model flagged GFS as ~1% overvalued at its August 24 close of $45.95. The stock also fell roughly 39.5% over the trailing month around that point.
- **Bull case:** According to a DCF story from the Simply Wall St community, GFS is trading at a 38% discount due to its differentiated FD-SOI, RF, and power management technologies, as well as its recent acquisition of Photeon Technologies' IVR business. This trend has not gone unnoticed by the sell-side either; one valuation estimate was increased from $51.30 to $81 following the Q2 earnings, and its TSR for the last year is about 67%.

I personally am inclined to favor the undervalued one based on the above moat logic for geographic diversification, although that it could really go either way (im not offering investment advice btw).

## 4. The Business of Looksmaxxing

Shifting away from markets for a second. As someone who posts gym content (@dandoesrepz), I'm watching a consumer trend from a growing industry that I think is growing exponentially quicker and deserves more attention in Wall Street right now.

It is not just some underground meme anymore, but a major sector within a rapidly expanding search cluster. In the family of "-maxxing" terms describing self-optimization jargon, looksmaxxing tops other search terms with 301,000 monthly searches, which is three times higher than the runner-up's searches. "Maxxing," the umbrella term, gained in searches by a factor of five – from 1,900 to 9,900 monthly searches in one year. In the 2026 Health and Fitness Report published by YPulse, "looksmaxxing and mogging culture" is mentioned as a real phenomenon changing the motivational factors in fitness among 13–39 year olds, along with – and this is what I noticed – a cultural merging of gym culture with street and rave culture attracting many more people than mere "bodybuilding" did.

The market numbers back up what the culture is doing. The US Sports & Fitness Nutrition Supplements Market will be worth $28.3B in 2026 and forecasted to grow to $57.5B in 2035 (CAGR of 8.2%). Protein powder, creatine, pre-workout, and energy drinks will clearly benefit from that; and the drivers of the growth are mentioned as 'stacking' and 'influencer', which is exactly what I've expected. More people are buying entry level products, driven by just the content and lifestyle itself.

However, there is a genuine negative consequence of this trend that cannot be simply ignored. An expanded audience with a desire for quick results is known to have one very evident negative aspect. According to global statistics, the lifetime prevalence rates of anabolic-androgenic steroid use amount to 1-5% and are overwhelmingly common amongst young, non-competitive gym attendees. In 2026, a study was published that proved that increased engagement with social media and its specific aspects like exposure to muscularity-related content and body comparison led to higher intentions of using steroids even in those individuals that did not ever use them before. There are many established health risks: problems with cardiovascular system, liver, endocrine and mental health.

The way I see it, looksmaxxing is an incredibly compelling consumer story, and I firmly believe that the addressable market for the supplement angle continues to expand. However, the same trends that are bringing more people into this space are also pushing some of those people toward dangerous extremes.

## Sources

**Meta settlement:**
- [Utah Governor's office settlement announcement](https://governor.utah.gov/press/utah-secures-12-2-billion-settlement-with-meta-over-child-safety-practices/)
- [NPR settlement details](https://www.npr.org/2026/08/26/nx-s1-5944781/meta-settlement-child-safety-lawsuit)
- [CNN Business $18B settlement approved](https://www.cnn.com/2026/08/26/tech/meta-states-settle-trial-children)
- [CNBC settlement structure and stock reaction](https://www.cnbc.com/2026/08/26/meta-social-media-trial-settlement.html)
- [NPR "inflection point" analysis](https://www.npr.org/2026/08/27/nx-s1-5945278/meta-settlement-child-safety-big-tech)

**Compute / China models / export controls:**
- [Tom's Hardware Kimi K3 tops Frontend Code Arena](https://www.tomshardware.com/tech-industry/artificial-intelligence/moonshot-releases-2-8-trillion-parameter-kimi-k3)
- [IntuitionLabs Kimi K3 benchmarks and OpenRouter share](https://intuitionlabs.ai/articles/kimi-k3-vs-claude-gpt-5-gemini)
- [Built In DeepSeek H800 efficiency story](https://builtin.com/articles/trump-lifts-ai-chip-ban-china-nvidia)
- [TechTimes Blackwell loophole / H200 order volume](https://www.techtimes.com/articles/320544/20260715/nvidia-h200-shipments-china-called-trivial-blackwell-loophole-draws-fire.htm)
- [GPUSmith current chip export restriction rundown](https://gpusmith.com/articles/en/nvidia-gpu-export-restrictions)

**Semiconductor correction / GlobalFoundries:**
- [TradingView 2026 semiconductor selloff analysis](https://www.tradingview.com/news/leverage_shares:c8d519c05094b:0-the-2026-semiconductor-selloff-creates-an-opportunity/)
- [Forbes July 2026 selloff details](https://www.forbes.com/sites/petercohan/2026/07/08/intel-stock-down-21-inside-the-july-2026-semiconductor-selloff/)
- [Motley Fool SOXX vs SMH YTD performance](https://www.fool.com/investing/2026/08/26/prediction-soxx-will-continue-to-outperform-smh-he/)
- [NIST GlobalFoundries CHIPS award detail](https://www.nist.gov/chips/globalfoundries-new-york-malta)
- [GuruFocus GFS valuation, Aug 24 close](https://www.gurufocus.com/news/9050311/a-look-at-globalfoundries-inc-gfs-after-44-decline-gf-value-4540-vs-price-4595)
- [Simply Wall St GFS undervalued narrative](https://finance.yahoo.com/markets/stocks/articles/globalfoundries-gfs-stock-looks-discounted-031803012.html)

**Looksmaxxing / fitness economy:**
- [YPulse 2026 Health and Fitness Report](https://www.ypulse.com/report/2026/06/10/health-and-fitness-report-3/)
- [Rising Trends "maxxing" search volume data](https://www.risingtrends.co/blog/maxxing-trend)
- [Global Growth Insights supplement market sizing](https://www.globalgrowthinsights.com/market-reports/sports-and-fitness-nutrition-supplements-market-101398)
- [UNSW social media and steroid use in young men](https://www.unsw.edu.au/newsroom/news/2025/04/social-media-men-steroids-how-to-mitigate-risks)
- [Medical Xpress social media and steroid-use intentions study](https://medicalxpress.com/news/2026-02-social-media-stronger-anabolic-steroid.html)
