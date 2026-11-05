-- Imports the news posts that lived in lib/content.json into the CMS, so they are edited in Admin > Posts.
-- Generated from that file; safe to run more than once (fixed ids, ON CONFLICT upsert). Same /{slug}/ addresses as before.
--   Local:  Supabase dashboard > SQL Editor > paste this file > Run


INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, featured_image_alt, status, is_featured, published_at, created_at, updated_at, og_title, og_description)
VALUES ('00000000-0000-0000-b000-000000000001', 'Capital Gain Tax - When is the CGT Deadline', 'capital-gain-tax-when-is-the-cgt-deadline-ireland', '<h2><b>Capital Gains Tax (CGT)</b></h2>
<p><a href="https://taxlinkaccountants.ie/capital-gain-tax/">Capital Gains Tax (CGT)</a> is a tax on the profit made from selling assets such as property or shares. It’s essential to be aware of the deadlines for CGT payments to ensure compliance and avoid penalties. Some common assets that people sell, that are subject to CGT, include investment property and common stocks and shares.</p>
<h3><b>CGT Payment Deadlines:</b></h3>
<p><b>Sales from 1st January to 30th November:</b> For assets sold during this period, CGT must be paid by <b>15th December</b> of the same year. For example, if you sell an asset in October 2024, the CGT payment is due by 15th December 2024.</p>
<p><b>Sales in December:</b> For assets sold between 1st and 31st December, the CGT payment is due by <b>31st January</b> of the following year. Therefore, a sale in December 2024 requires CGT payment by 31st January 2025.</p>
<p>It is your responsibility to calculate what CGT is due, file the appropriate return and pay the liability on time. The CGT return is called a Form CG1.</p>
<p>It is also important to note, in respect of assets disposed of up to 30 November 2024, that while you pay the CGT in the year the assets are sold, you need to file the return by 31 October of the following year. So, if you sold an asset in 2024 you need to file a return, on or before 31 October 2025.</p>
<p><strong>Once registered for CGT, payments can be made online through Revenue’s ROS or myAccount platforms.</strong></p>
<p>As of now, the standard CGT rate in Ireland is <b>33%</b>. However, various reliefs and exemptions may apply, potentially reducing your CGT liability. Engaging in tax planning can help identify opportunities for tax savings.</p>
<h3><b>Need Assistance?</b></h3>
<p>Our tax accountants will work closely with you to optimise Capital Gains tax returns through a variety of reliefs and exemptions, a number of which have been created relatively recently.</p>
<p>The Capital Gains tax is chargeable as a result of gains made from selling or transferring assets, most commonly in the form of the share capital of their business or other significant personal assets (like second homes for example).</p>
<p>However, tax planning is the key to minimising Capital Gains tax. It is well worth discussing your long term plans with our tax team, so you are able to structure your assets in a way which keeps Capital Gains tax to a minimum when the time comes to sell.</p>
<p><a href="/contact/">Contact us today for a free, no-obligation consultation.</a></p>
<p>', 'It is your responsibility to calculate what CGT is due, file the appropriate return and pay the liability on time.', '/images/wp/capital-gain-tax-deadline.jpg', 'capital gain tax deadline', 'published', 0, '2024-11-29T00:00:00.000Z', '2024-11-29T00:00:00.000Z', '2024-11-29T00:00:00.000Z', 'Capital Gain Tax - When is the CGT Deadline - MedicalAccountant.ie', 'It is your responsibility to calculate what CGT is due, file the appropriate return and pay the liability on time.')
ON CONFLICT (id) DO UPDATE SET title = excluded.title, slug = excluded.slug, content = excluded.content, excerpt = excluded.excerpt, featured_image_url = excluded.featured_image_url, featured_image_alt = excluded.featured_image_alt, status = excluded.status, is_featured = excluded.is_featured, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at, og_title = excluded.og_title, og_description = excluded.og_description;

INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, featured_image_alt, status, is_featured, published_at, created_at, updated_at, og_title, og_description)
VALUES ('00000000-0000-0000-b000-000000000002', 'UCD Med Week 2023 Raises Record Funds for Charity', 'ucd-med-week-2023-raises-record-funds-for-charity', '<p><strong>The spirit of community and charity shone brightly</strong> as <a href="https://societies.ucd.ie/event/med-week-2023-year-vs-year-fundraiser/">UCD Med Week 2023</a> concluded with unprecedented success, raising a record €30,398.73.</p>
<p>MedicalAccountant.ie is proud to have played a pivotal role in this monumental achievement as a t-shirts sponsor, contributing to the highest-ever in-person collection for the event.</p>
<p>This year’s MedWeek was more than just a fundraising event; it was a testament to the power of collective effort and compassion. The funds raised are set to make a significant impact on our chosen charity partners, <a href="https://dogsfordisabled.ie/">Irish Dogs for the Disabled</a>. This contribution will fully train two puppies, transforming them into invaluable aids for individuals with disabilities.</p>
<p></p>
<p>Our engagement in MedWeek 2023,We were delighted to sponsor the fabulous Med Day t-shirts, a symbol of unity and dedication amongst all participants. The enthusiasm and commitment of every volunteer, from those who baked and quizzed to those who collected donations, were the driving forces behind this remarkable accomplishment.</p>
<p>As MedicalAccountant.ie, we are more than just a <a href="/contact/">financial advisory firm for medical professionals</a>; we are a community player committed to making a difference. Supporting UCD MedWeek aligns perfectly with our ethos of giving back to the community and fostering positive change.</p>
<p>We extend our heartfelt gratitude to <a href="https://www.instagram.com/ucdmedsoc/">UCD MedSoc</a>, the tireless volunteers, and everyone who contributed to making this event a resounding success. Your hard work and generosity have set a new benchmark for what we can achieve together.</p>
<p></p>
<p>This collaboration exemplifies the potential for positive change when academia, business, and community unite. We look forward to future partnerships and continuing our commitment to impactful philanthropy.</p>
<p>In closing, a special thanks to UCD MedSoc for sharing the inspiring images and updates on their Instagram page. These glimpses into the week’s events not only highlight the fun and camaraderie but also the collective spirit that defines MedWeek.</p>
<p>Together, we’ve made a difference. Together, we’ve set a new standard for charitable giving.</p>
<p>If you looking for a <a href="/">Medical Accountant in Ireland</a>, Get in touch with us.</p>', 'MedicalAccountant.ie proudly supported UCD Med Week 2023, achieving a record-breaking €30,398.73 for a noble cause', '/images/wp/UCD-Med-Week.jpg', 'UCD Med Week', 'published', 0, '2023-11-21T00:00:00.000Z', '2023-11-21T00:00:00.000Z', '2023-11-21T00:00:00.000Z', 'UCD Med Week 2023 Raises Record Funds for Charity', 'MedicalAccountant.ie proudly supported UCD Med Week 2023, achieving a record-breaking €30,398.73 for a noble cause')
ON CONFLICT (id) DO UPDATE SET title = excluded.title, slug = excluded.slug, content = excluded.content, excerpt = excluded.excerpt, featured_image_url = excluded.featured_image_url, featured_image_alt = excluded.featured_image_alt, status = excluded.status, is_featured = excluded.is_featured, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at, og_title = excluded.og_title, og_description = excluded.og_description;

INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, featured_image_alt, status, is_featured, published_at, created_at, updated_at, og_title, og_description)
VALUES ('00000000-0000-0000-b000-000000000003', 'Why Filing Your Return Early Can Be a Great Deal for Healthcare Professionals - 7 Reasons to Look At', 'why-filing-your-return-early-can-be-a-great-deal-for-healthcare-professionals', '<p><strong>Take the lead this summer and submit your tax return ahead of schedule!</strong> This is a strategic move for healthcare professionals in Ireland, as advised by <a href="http://Medicalaccountant.ie">Medicalaccountant.ie</a>.</p>
<p>Even if you submit your taxes now, you’re not obligated to pay your tax bill until the November deadline. This opportunity to file your tax return early can significantly streamline your financial planning.</p>
<p>This October, evade the last-minute hustle to compile receipts, invoices, and paperwork for your taxes. Prevent the turmoil of misplaced documents and the frantic rush to get everything to your accountant. Early filing eliminates the worry of missing deadlines or procrastinating your taxes until the last minute.</p>
<p>Envision a tranquil October! No more frantic searches for receipts or panic because your taxes are already prepared, filed, and submitted while the kids were still enjoying their summer holidays. Remember – early filing of your tax return doesn’t necessitate early payment of your taxes. You can still wait until the standard November due date to pay any tax owed.</p>
<h2>Here are seven compelling reasons why early tax return filing is a strategic move for doctors, GPs, dentists, and other healthcare professionals:</h2>
<h3><strong>Extended Consultation with Your Accountant</strong>:</h3>
<p>Early filing provides more time to meet with your accountant and thoroughly discuss tax planning strategies.</p>
<h3><strong>Accelerated Tax Refunds</strong>:</h3>
<p>If you are due a refund, why wait? File early and expedite your refund process.</p>
<h3><strong>Ample Time for Tax Planning</strong>:</h3>
<p>Knowing your tax liability early gives you more time to properly budget and financially plan for any taxes owed.</p>
<h3><strong>Evade Late Filing Penalties</strong>:</h3>
<p>Late filing can lead to hefty surcharges and financial penalties. Avoid these by filing early.</p>
<h3><strong>Reduced Stress, Enhanced Relaxation</strong>:</h3>
<p>Early tax filing means you can spend your time enjoying autumn with family and avoid the season’s usual tax headaches.</p>
<h3><strong>Improved Accuracy</strong>:</h3>
<p>With more time to prepare, you’re less likely to make errors on your tax return.</p>
<h3><strong>Financial Stability</strong>:</h3>
<p>Early filing gives you a clear picture of your financial standing before the end of the fiscal year.</p>
<p>So, this summer, Irish healthcare professionals, gather what you need now and file your tax return early to simplify your life. Join the group of sensible professionals who file taxes early and smile knowing that major task is already taken care of.</p>
<p>Avoid the frustrations that many professionals face each October – searching for documents, cramming taxes into the last days, fearing missed deadlines. Don’t let your practice fall into these common pitfalls.</p>
<p>Make this autumn smooth sailing by filing early. Reclaim your October and bid farewell to tax time chaos. Spend those autumn weekends relaxing, not rushing receipts to your accountant.</p>
<p>Early filing doesn’t just reduce stress – it’s also a smart financial move. Collaborate with your accountant to maximize deductions and tax planning when there’s no deadline pressure. Understand your tax liability early and budget accordingly. And if you’re owed a refund, get that money back faster!</p>
<p>This summer, aim to have your taxes filed by September. Turn tax time into relaxation time. You’ll be grateful come October when others are in a frenzy but your filings are already sorted. Take charge of your tax timeline. Don’t let the endless receipts, invoices, and paperwork pile up. Gather what you need for your accountant now so your taxes are handled early. You work hard all year – avoid extra headaches from leaving taxes to the last moment.</p>
<p>Learn from the wise early birds of the healthcare world. Savvy professionals don’t wait for the busy autumn tax rush – they act now and file early! Join those reaping the many benefits and avoid another October tax scramble.</p>
<p>This year, try something new. Prepare your documents in the summer heat. File those taxes early while the weather’s still fine. Then come autumn, while others stress and strain, you can relax with the same peace of mind the early birds enjoy.</p>
<p><a href="/contact/">Talk to specialist Medical accountants Now</a></p>', 'Take the lead this summer and submit your tax return ahead of schedule! This is a strategic move for healthcare professionals in Ireland, as advised by', '/images/wp/file-your-tax-return-early-1.jpg', 'file your tax return early (1)', 'published', 0, '2023-07-21T00:00:00.000Z', '2023-07-21T00:00:00.000Z', '2023-07-24T00:00:00.000Z', 'Why Filing Your Return Early Can Be a Great Deal for Healthcare Professionals - 7 Reasons to Look At - MedicalAccountant.ie', 'Take the lead this summer and submit your tax return ahead of schedule! This is a strategic move for healthcare professionals in Ireland, as advised by')
ON CONFLICT (id) DO UPDATE SET title = excluded.title, slug = excluded.slug, content = excluded.content, excerpt = excluded.excerpt, featured_image_url = excluded.featured_image_url, featured_image_alt = excluded.featured_image_alt, status = excluded.status, is_featured = excluded.is_featured, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at, og_title = excluded.og_title, og_description = excluded.og_description;

INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, featured_image_alt, status, is_featured, published_at, created_at, updated_at, og_title, og_description)
VALUES ('00000000-0000-0000-b000-000000000004', 'New Temporary Business Energy Support Scheme', 'new-temporary-business-energy-support-scheme', '<p>Small and medium businesses are the backbone of our domestic economy and they support thousands of jobs.</p>
<p>Today, Minister Donohoe announced that a new scheme to help such businesses pay for increasing energy costs will be launched. Full details of the new Temporary Business Energy Support Scheme (TBESS) are yet to be published but what we understand from the Minister’s speech is that it will pay for 40 percent of the increase in gas and electricity that <a href="https://taxlink.ie/small-business-accountants/">small and medium businesses</a> are facing.</p>
<p><strong>The details of the scheme outlined by the Minister today are set out below and once more details are published we will update members via Chartered Accountants Tax News.</strong></p>
<ul>
<li>The scheme will be open to businesses that carry on a Case 1 trade, are tax compliant and have experienced a significant increase (more than 50 percent) in their natural gas and electricity costs;</li>
<li>It will be administered by the Revenue Commissioners and will operate on a self-assessment basis;</li>
<li>The scheme will operate by comparing the average unit price for the relevant bill period in 2022 with the average unit price in the corresponding reference period in 2021;</li>
<li>In order to be eligible for the scheme, the average unit price must have increased by more than 50 percent;</li>
<li>Claims will be able to be made by businesses for up to 40 percent of the amount of the increase in the bill, capped at €10,000 per month per trade;</li>
<li>An overall cap will apply on the total amount which a business can claim.</li>
<li>According to the <a href="https://enterprise.gov.ie/en/news-and-events/department-news/2022/september/202209271.html">Department of Enterprise Trade and Employment</a> payments will be backdated to September 2022 and will run until at least February 2023 and will cost €1.25 billion.</li>
</ul>
<p>The scheme is being designed to be compliant with the EU State Aid Temporary Crisis Framework and will require approval by the EU Commission in the advance of making payments.</p>', 'Minister Donohoe announced that a new scheme to help such businesses pay for increasing energy costs will be launched.', '/images/wp/Business-Energy-Support-Scheme.jpeg', 'Business Energy Support Scheme', 'published', 0, '2022-09-28T00:00:00.000Z', '2022-09-28T00:00:00.000Z', '2022-10-07T00:00:00.000Z', 'New Temporary Business Energy Support Scheme - MedicalAccountant.ie', 'Minister Donohoe announced that a new scheme to help such businesses pay for increasing energy costs will be launched.')
ON CONFLICT (id) DO UPDATE SET title = excluded.title, slug = excluded.slug, content = excluded.content, excerpt = excluded.excerpt, featured_image_url = excluded.featured_image_url, featured_image_alt = excluded.featured_image_alt, status = excluded.status, is_featured = excluded.is_featured, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at, og_title = excluded.og_title, og_description = excluded.og_description;

INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, featured_image_alt, status, is_featured, published_at, created_at, updated_at, og_title, og_description)
VALUES ('00000000-0000-0000-b000-000000000005', 'EWSS and CRSS support extended', 'ewss-and-crss-support-extended', '<p><strong>Following the announcement by An Taoiseach last Friday that new public health</strong> restrictions will be imposed on the hospitality sector and indoor events from Tuesday, 07 December to Sunday, 09 January 2022, it was expected that a new support scheme would be announced to target those affected businesses.</p>
<p>Earlier this week, however, it was decided to drop plans for a new scheme and instead extend two existing schemes namely the Employment Wage Subsidy Scheme (EWSS) and the Covid Restriction support Scheme(CRSS).</p>
<p>The EWSS will remain at its original rates for the next two months while the CRSS will remain in place until the end of January for businesses forced to closed.</p>
<p>A commercial rates waiver for hospitality, tourism and the live events industries will also be extended until March next year.</p>
<p>The Pandemic Unemployment Payment (PUP) has been reopened for new applicants who lost their job on or after 7 December as a result of the new restrictions being imposed.</p>', 'New public health restrictions will be imposed on the hospitality sector and indoor events from Tuesday, 07 December to Sunday, 09 January 2022.', '/images/wp/New-CRO-Filing-Requirement---PPS-Numbers.jpg', 'EWSS and CRSS support extended', 'published', 0, '2021-12-21T00:00:00.000Z', '2021-12-21T00:00:00.000Z', '2023-05-25T00:00:00.000Z', 'EWSS and CRSS support extended - MedicalAccountant.ie', 'New public health restrictions will be imposed on the hospitality sector and indoor events from Tuesday, 07 December to Sunday, 09 January 2022.')
ON CONFLICT (id) DO UPDATE SET title = excluded.title, slug = excluded.slug, content = excluded.content, excerpt = excluded.excerpt, featured_image_url = excluded.featured_image_url, featured_image_alt = excluded.featured_image_alt, status = excluded.status, is_featured = excluded.is_featured, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at, og_title = excluded.og_title, og_description = excluded.og_description;

INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, featured_image_alt, status, is_featured, published_at, created_at, updated_at, og_title, og_description)
VALUES ('00000000-0000-0000-b000-000000000006', 'Tax return deadline Ireland 2021 - Don''t ruin your festive season!', 'tax-return-ireland-deadline-2021', '<p>An article highlighting some key information around the self-assessment deadline of 17th November 2021 ( Tax return deadline ireland 2021 ).</p>
<p>At this time of year, we are getting ready to enjoy Halloween and Christmas.</p>
<p>But small self employed individuals and landlords shouldn’t overlook their requirement to <a href="/">file a tax return</a> by 17th Nov 2021.</p>
<p>It takes some time to get registered with <a href="https://www.revenue.ie/en/Home.aspx">Revenue</a>– in terms of informing them that you need file a tax return (because you’re newly self-employed for example) So it’s really important that you factor in some processing time.</p>
<p>And remember, contrary to popular belief, Revenue will not necessarily send you a tax return to complete- it is your responsibility to register for Self-Assessment if necessary.</p>
<p>Late Filing Penalties There will be late filing penalties if tax returns are not made in time. If you file your Income-tax return late, a surcharge may be added on to your tax due, as follows:</p>
<p>• If you miss the deadline of 31/10/2021 (or 17/11/2021 for ROS customers) and you file your tax return before 31st December 2021, there is an extra penalty of 5% of the tax due (maximum of €12,695)</p>
<p>• If you file your 2020 tax return after 31st December 2021, there is an extra penalty of 10% of the tax due (maximum of €63,485), What is taxable?</p>
<p>The good news is that only profits from renting out property or business are liable for income tax.</p>
<p>To calculate your profit you will need to calculate your total income in any tax year and deduct any ‘allowable expenses’. The remaining sum will be subject to income tax, but remember that the rate of tax you pay will depend on your total taxable income.</p>
<p><strong>Here to Help Revenue online filing system for tax returns calculates your tax liability for you.</strong></p>
<p>But needless to say, it will not check whether your figures are accurate or that you have claimed your full entitlement to expenses, reliefs and allowances.</p>
<p>But we would be happy to take care of all your tax affairs for you; from <a href="/company-formation/">registration</a> with Revenue, to completion of the return, to calculation of your tax liability and the due dates. So don’t ruin you festive season by filing your tax return late and facing a late filing penalty.</p>
<p><em>This article is intended to inform rather than advise and is based on legislation and practice at the time. Taxpayer’s circumstances do vary and if you feel that the information provided is beneficial it is important that you contact us before implementation.</em></p>
<p><strong>Also Read</strong>:<a href="/budget-report-2022/">Budget Report 2022</a></p>
<p>Are you looking for <a href="/">Specialist Medical Accountants?</a> – <a href="/contact/">Get in touch with us Now</a>.</p>', 'Tax return deadline Ireland 2021 - An article highlighting some key information around the self-assessment deadline of 17th November 2021.', '/images/wp/tax-return-ireland-deadline-2021.jpeg', 'tax return Ireland deadline 2021', 'published', 0, '2021-10-23T00:00:00.000Z', '2021-10-23T00:00:00.000Z', '2021-10-23T00:00:00.000Z', 'Tax return deadline Ireland 2021 - Don''t ruin your festive season!', 'Tax return deadline Ireland 2021 - An article highlighting some key information around the self-assessment deadline of 17th November 2021.')
ON CONFLICT (id) DO UPDATE SET title = excluded.title, slug = excluded.slug, content = excluded.content, excerpt = excluded.excerpt, featured_image_url = excluded.featured_image_url, featured_image_alt = excluded.featured_image_alt, status = excluded.status, is_featured = excluded.is_featured, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at, og_title = excluded.og_title, og_description = excluded.og_description;

INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, featured_image_alt, status, is_featured, published_at, created_at, updated_at, og_title, og_description)
VALUES ('00000000-0000-0000-b000-000000000007', 'Budget Report 2022', 'budget-report-2022', '<p><strong><em>Minister for Finance, Paschal Donohoe, and Minister for Public Expenditure, Michael McGrath delivered the 2022 Budget today, Tuesday 12 October 2021.</em></strong></p>
<p>Budget 2022 has set Ireland on a path to sustainable recovery and growth as Irish businesses seek to restart and recover.</p>
<p>Tax cuts were a little higher than signalled meaning all workers &amp; the self-employed will have more money in their pockets next year. Businesses will be very glad to see the extension of the Employment Wage Subsidy Scheme (EWSS).</p>
<h3><strong>Take a look at how Budget 2022 affects you:</strong></h3>
<ul>
<li>Personal Tax Credit increased by €50 to €1,700</li>
<li>Employee Tax Credit/Earned Income Tax Credit also increased by €50 to €1,700</li>
<li>Amount you can earn before suffering income tax at 40% increased by €1,500 to €36,800</li>
<li>Employment Wage Subsidy Scheme to be extended beyond December 2021 to 30 April 2022 albeit at reduced rates</li>
<li>VAT rate on hospitality and tourism sector to remain at 9% until 31 August 2022</li>
<li>Commercial rates holiday to be extended to end of 2021 with amended conditions meaning not all businesses will qualify</li>
<li>Amendment of Debt Warehousing Scheme which will benefit company directors</li>
<li>Working from Home – improved tax relief for utilities and broadband costs incurred by employees working from home</li>
</ul>
<h3><strong>Tax Credits and Rate Bands</strong></h3>
<p>The Personal Tax Credit will be increased for everybody by €50 to €1,700 from 01 January 2022.</p>
<p>The Earned Income Tax Credit and Employee Tax Credit are also being increased by €50 to €1,700 for 2022</p>
<p>In addition to this there will be a €1,500 increase in the amount you can earn at 20% before moving to the higher rate of 40%.</p>
<p>For 2022 the new 20% cut off point will be €36,800.</p>
<h3><strong>EMPLOYMENT WAGE SUBSIDY SCHEME (EWSS) </strong></h3>
<p>The Employment Wage Subsidy Scheme (EWSS), which was due to expire on 31 December 2021 has been extended for a further 4 months to 30 April 2022 although the rates will be reduced incrementally.</p>
<p><strong>The updated details are as follows:</strong></p>
<ul>
<li>current arrangements for EWSS remain in place until 30 November 2021;</li>
<li>for the three months December 2021 to February 2022 there will be two subsidy rates namely €151.50 and €203 per employee per week;</li>
<li>for the two months March 2022 and April 2022, a single flat rate of €100 per week will apply;</li>
<li>the existing reduced rate of Employers’ PRSI (0.5%) will continue to apply until the end of February 2022. The full Employers’ PRSI contribution will be reintroduced from 1 March 2022 until the scheme ends;</li>
<li>scheme to conclude on 30 April 2022.</li>
</ul>
<p>Eligibility for the scheme will continue to be a 30% reduction in turnover/customer orders in the full year 2021 as compared to the full year 2019.</p>
<p>The scheme will close to new employer entrants with effect from 1 January 2022<strong> </strong></p>
<h3><strong>VAT REDUCTION FOR TOURISM/ HOSPITALITY SECTOR </strong></h3>
<p>The reduced 9% rate of VAT applying to the hospitality and tourism sector, which was due to expire on 31 December 2021, has been extended up to 31 August 2022.</p>
<h3><strong>START-UP RELIEF </strong></h3>
<p>Since 2008 there has been a relief from corporation tax for start-up companies in their first three years of trading.</p>
<p>The relief is granted by reducing the corporation tax payable on the profits of the new trade and gains on the disposal of any assets used for the purposes of the new trade. The amount of relief available is directly linked to the amount of Employers’ PRSI paid.</p>
<p>The relief will be extended for a period of five years until 31 December 2026.</p>
<p>The relief will also be amended such that start-up companies will be able to avail of the relief for up to five years, in place of the current three years.</p>
<p><a href="https://taxlink.ie/wp-content/uploads/2021/10/tax-rates-2022.pdf"><strong>Please click here for more info on tax and Bands</strong></a></p>
<p><strong>Date Published 12 Oct 2021</strong></p>
<p>This article is intended to inform rather than advise and is based on legislation and practice at the time. Taxpayer’s circumstances do vary and if you feel that the information provided is beneficial it is important that you contact us before implementation.</p>', 'Minister for Finance, Paschal Donohoe, and Minister for Public Expenditure, Michael McGrath delivered the 2022 Budget today, Tuesday 12 October 2021.', '/images/wp/irish-budget-2022.jpeg', 'irish budget 2022', 'published', 0, '2021-10-13T00:00:00.000Z', '2021-10-13T00:00:00.000Z', '2021-10-13T00:00:00.000Z', 'Budget Report 2022 - MedicalAccountant.ie', 'Minister for Finance, Paschal Donohoe, and Minister for Public Expenditure, Michael McGrath delivered the 2022 Budget today, Tuesday 12 October 2021.')
ON CONFLICT (id) DO UPDATE SET title = excluded.title, slug = excluded.slug, content = excluded.content, excerpt = excluded.excerpt, featured_image_url = excluded.featured_image_url, featured_image_alt = excluded.featured_image_alt, status = excluded.status, is_featured = excluded.is_featured, published_at = excluded.published_at, created_at = excluded.created_at, updated_at = excluded.updated_at, og_title = excluded.og_title, og_description = excluded.og_description;
