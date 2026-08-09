import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';

/**
 * Material Symbols Rounded, filled — Apache 2.0, no attribution required.
 *
 * These replace a hand-written feather-style outline set, and the reason is
 * that thin strokes were the wrong language twice over. Visually, the app is
 * cartoon by rule — flat fills and bold outlines on the board, per the spec's
 * own design correction — and a 1.5px hairline glyph beside it reads as a
 * utility app dropped into a game. Technically, a thin stroke antialiased
 * across a fractional coordinate is soft at every size, which is the blur that
 * no amount of weight tuning was going to fix. A filled shape has no stroke to
 * smear.
 *
 * Paths are in Material's own 960 grid with a `0 -960 960 960` viewBox, kept
 * verbatim rather than re-fitted to 24 — a transcription is a chance to be
 * wrong, and `Icon` can just as easily scale by 960. `ICON_VIEWBOX` and the
 * translate in `Icon` are what make that work.
 *
 * Adding one: take the `-fill` variant from `@material-symbols/svg-700`'s
 * `rounded` folder and paste its `d` attribute. No other set mixes in — one
 * author is the whole point.
 */
const ICON_VIEWBOX = 960;

const ICONS = {
  back: 'm430-481 165 165q14 14 13.5 33T594-250q-14 14-33.5 14T527-250L330-447q-7-7-11-16t-4-18q0-9 4-18t11-16l198-198q14-14 33.5-14t33.5 14q14 14 14 33.5T595-646L430-481Z',
  play: 'M295-244v-478q0-22 14.07-35t32.5-13q6.2 0 12.81 1.5 6.62 1.5 13.5 5.43L744-522q10.5 7 16.25 17t5.75 22q0 12-5.75 22T744-444L367.88-202.93Q361-199 354.36-198q-6.64 1-12.86 1-18.5 0-32.5-12.27-14-12.28-14-34.73Z',
  stages:
    'M189-510q-38.73 0-66.36-27.64Q95-565.28 95-605v-166q0-38.72 27.64-66.86Q150.27-866 189-866h167q38.73 0 66.36 28.14Q450-809.72 450-771v166q0 39.72-27.64 67.36Q394.73-510 356-510H189Zm0 415q-38.73 0-66.36-27.64Q95-150.27 95-189v-167q0-38.73 27.64-66.36Q150.27-450 189-450h167q38.73 0 66.36 27.64Q450-394.73 450-356v167q0 38.73-27.64 66.36Q394.73-95 356-95H189Zm416-415q-39.72 0-67.36-27.64T510-605v-166q0-38.72 27.64-66.86T605-866h166q38.72 0 66.86 28.14T866-771v166q0 39.72-28.14 67.36T771-510H605Zm0 415q-39.72 0-67.36-27.64Q510-150.27 510-189v-167q0-38.73 27.64-66.36Q565.28-450 605-450h166q38.72 0 66.86 27.64Q866-394.73 866-356v167q0 38.73-28.14 66.36Q809.72-95 771-95H605Z',
  settings:
    'M407-55q-17.84 0-31.51-10.63Q361.83-76.26 360-94l-15-95q-13-4-29.5-13.5T288-221l-85 40q-16.88 7-34.75 2.12Q150.37-183.77 141-201L69-331q-10-15-6-32.5T82-392l79-59q-1-6.04-1.5-14.5T159-480q0-6.04.5-14.5T161-509l-79-58q-16-11-19.5-28.5T69-629l72.38-130.19Q150-774 167.5-780q17.5-6 34.5 1l88 40q10-8 26-17t29-13l15-95.57Q362-884 375.61-895q13.62-11 31.39-11h146q17.84 0 31.51 10.92Q598.17-884.16 600-865l15 95q12.81 5.05 29.4 13.53Q661-748 672-739l85-40q17-7 34.5-1t26.38 20.84l74.24 130.32Q901-613 897.5-595q-3.5 18-19.5 28l-80 56q1 7 2 15.5t1 15.53q0 7.03-1 14.98-1 7.96-2 14.99l80 57q16 10 19.5 28t-5.37 33.59L819-201q-9.37 16.23-26.75 21.62Q774.88-174 758-181l-87-40q-11 9-26.5 18.5T615-189l-15 95q-1.83 17.74-15.49 28.37Q570.84-55 553-55H407Zm71-295q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Z',
  undo: 'M315-175q-20 0-33.5-13.5T268-222q0-20 13.5-33.5T315-269h270q61 0 103.5-43.5t42.5-105q0-61.5-42.5-105.5T585-567H315l65 65q14 15 14 33.5T380-436q-14 15-33 15t-33-15L168-580q-7-7-11-16t-4-18q0-9 4-18t11-16l146-145q14-14 33-14t33 14q14 15 14 33.5T380-727l-65 66h269q100 0 171 71t71 171.5q0 100.5-71 172T584-175H315Z',
  redo: 'M646-567H375q-61 0-103.5 43.5T229-418q0 62 42.5 105.5T375-269h270q20 0 33.5 13.5T692-222q0 20-13.5 33.5T645-175H376q-100 0-170.5-71T135-417.5q0-100.5 70.5-172T376-661h270l-66-66q-14-14-14-32.5t14-33.5q14-14 33-14t33 14l146 145q7 7 11 16t4 18q0 9-4 18t-11 16L646-436q-14 15-33 15t-33-15q-14-14-14-32.5t14-33.5l66-65Z',
  restart:
    'M477-135q-143 0-244-101T132-480q0-143 101-244.5T477-826q91 0 160.5 36.5T757-687v-103q0-15 10-25.5t25.5-10.5q15.5 0 26 10.5T829-790v208q0 20-14 33.5T781-535H572q-15 0-25-10.5T537-571q0-15 10.5-25t25.5-10h128q-39-56-94-90.5T477-731q-105 0-178 73t-73 178q0 105 73 178t178 73q67 0 126-33.5t92-91.5q11-16 29-23t36 1q18 7 25 23.5t-1 32.5q-44 85-126.5 135T477-135Z',
  next: 'M645-433H182q-20 0-33.5-13.5T135-480q0-20 13.5-33.5T182-527h463L447-725q-14-14-14.5-33.5T446-793q14-14 34-13.5t34 14.5l278 278q7 7 11 16t4 18q0 9-4 18t-11 16L513-168q-15 15-34 15t-33-15q-14-14-14-33t14-33l199-199Z',
  lock: 'M229-57q-38.78 0-66.39-27.61T135-151v-416q0-39.19 27.61-67.09Q190.22-662 229-662h50v-74q0-85.19 58.37-144.59Q395.73-940 479.87-940q84.13 0 142.63 59.41Q681-821.19 681-736v74h50q39.19 0 67.09 27.91Q826-606.19 826-567v416q0 38.78-27.91 66.39Q770.19-57 731-57H229Zm305.5-247.03Q557-326.06 557-357q0-30-22.67-54.5t-54.5-24.5q-31.83 0-54.33 24.5t-22.5 55q0 30.5 22.67 52.5t54.5 22q31.83 0 54.33-22.03ZM373-662h214v-73.77q0-46.73-30.65-77.98-30.64-31.25-76-31.25Q435-845 404-813.75q-31 31.25-31 77.98V-662Z',
  check:
    'm378-358 350-349q14-14 34-14t34 14q14 14 14 34t-14 34L412-256q-14 14-34 14t-34-14L164-436q-14-14-14-34t14-34q14-14 34-14t34 14l146 146Z',
  home: 'M135-189v-377q0-22.25 9.38-42 9.37-19.75 27.62-33l251-189q24.68-19 56.84-19Q512-849 537-830l251 189q18.25 13.25 28.13 33 9.87 19.75 9.87 42v377q0 39.75-27.62 66.87Q770.75-95 731-95H613q-19.75 0-33.37-13.63Q566-122.25 566-142v-217q0-19.75-13.62-33.38Q538.75-406 519-406h-78q-19.75 0-33.37 13.62Q394-378.75 394-359v217q0 19.75-13.62 33.37Q366.75-95 347-95H229q-39.75 0-66.87-27.13Q135-149.25 135-189Z',
  /*
    A gift box, not a calendar.

    It was `calendar_month` while the destination was called "Daily", where the
    glyph carried the "once a day" half of the name. The tab is "Rewards" now
    and the screen holds an ad payout and a bonus puzzle beside the streak — a
    calendar would be naming the schedule of one thing on a page about three.
  */
  gift: 'M149-275v86h662v-86H149Zm0-471h93q-4-9-7.5-22.18Q231-781.35 231-793q0-51.58 36.5-87.79Q304-917 354.85-917q32.54 0 59.85 16 27.3 16 43.3 41l22 33 23-33q17-26 43.59-41.5Q573.17-917 603-917q52.33 0 89.17 35.81Q729-845.39 729-792.66q0 10.66-2.5 22.16T719-746h92q39.46 0 67.23 27.77Q906-690.46 906-651v462q0 39.05-27.77 66.53Q850.46-95 811-95H149q-39.05 0-66.53-27.47Q55-149.95 55-189v-462q0-39.46 27.47-67.23Q109.95-746 149-746Zm0 341h662v-246H592l67 94q8 12 5 27t-15.08 23.33q-13.09 8.67-27.5 6.17Q607-503 598-516L480-685 362-516q-9 13-23.44 15.5Q324.11-498 312-507q-12-8-15-23t5-27l68-94H149v246Zm244.5-350.5q15.5-15.5 15.5-37T393.5-830Q378-846 356-846t-37.5 16Q303-814 303-792.5t15.5 37Q334-740 356-740t37.5-15.5ZM603-740q23 0 38.5-15.5t15.5-37q0-21.5-15.5-37.5T603-846q-21 0-36.5 16T551-792.5q0 21.5 15.5 37T603-740Z',
  /*
    A shop front, not a conical flask and not a bag.

    The flask was chosen when the shop's stock was vial skins, so the glyph named
    what was on the shelf rather than where pressing it goes — beside a gift box
    and a trophy it read as a laboratory.

    `shopping_bag` was the handoff's shape and was tried here. Filled at 23dp it
    is a solid slab with a notch for the handle: this set has no outline variant,
    so a glyph whose whole identity is its silhouette comes out as a heavy blob
    next to the gift box. `storefront`'s scalloped awning gives it structure that
    survives being filled, and "a place you visit" is the better reading for a
    game's shop anyway.
  */
  shop: 'M185-86q-39.05 0-66.53-27.47Q91-140.95 91-180v-331q-30-30-36-69.06-6-39.05 5-74.94l43-135q11-35 37-55.5t61-20.5h553q35.78 0 63.89 21T856-790l44 135q11 35 3.5 73T869-515v335q0 39.05-27.77 66.53Q813.46-86 774-86H185Zm385-473q24.47 0 42.24-15.5Q630-590 626-614l-24-157h-83v156q0 23.21 14.38 39.61Q547.75-559 570-559Zm-187 0q23.33 0 40.66-15.89Q441-590.79 441-615v-156h-83l-24 157q-3 22 11.12 38.5Q359.23-559 383-559Zm-181.77 0Q222-559 237-574q15-15 17-35l25-162h-83l-44 139q-9 29.21 6 51.11Q173-559 201.23-559ZM758-559q28 0 43.5-21.5T808-632l-44-139h-82l24 162q2 20 16.9 35 14.9 15 35.1 15Z',
  /*
    Progress, in the nav bar.

    `stats` — the bar chart — stays, but for the difficulty row, where three
    ascending bars are literally what the control selects. As the Progress tab's
    glyph it was a chart icon on a screen about levels cleared and stars earned;
    a trophy is what those add up to, and it is the handoff's own choice.
  */
  trophy:
    'M250-526v-166H146v44q0 45 29.5 78.5T250-526Zm461 0q44-10 74-43.5t30-78.5v-44H711v166ZM433-180v-117q-55-13-97.5-48.5T273-432q-92 2-157-61T51-648v-44q0-39.75 27.63-67.38Q106.25-787 146-787h104v-28q0-23.75 17.63-41.88Q285.25-875 310-875h341q23.75 0 41.88 18.12Q711-838.75 711-815v28h104q38.75 0 66.38 27.62Q909-731.75 909-692v44q0 92-65 155t-157 61q-20 51-62.5 86.5T527-297v117h94q19.75 0 33.38 13.68Q668-152.65 668-132.82q0 19.82-13.62 33.32Q640.75-86 621-86H339q-19.75 0-33.37-13.68Q292-113.35 292-133.18q0-19.82 13.63-33.32Q319.25-180 339-180h94Z',
  stats:
    'M710-135q-20.75 0-34.37-13.63Q662-162.25 662-182v-221q0-19.75 13.63-33.88Q689.25-451 710-451h68q19.75 0 33.88 14.12Q826-422.75 826-403v221q0 19.75-14.12 33.37Q797.75-135 778-135h-68Zm-264 0q-19.75 0-33.37-13.63Q399-162.25 399-182v-596q0-19.75 13.63-33.88Q426.25-826 446-826h68q19.75 0 33.38 14.12Q561-797.75 561-778v596q0 19.75-13.62 33.37Q533.75-135 514-135h-68Zm-264 0q-19.75 0-33.37-13.63Q135-162.25 135-182v-396q0-19.75 13.63-33.88Q162.25-626 182-626h69q19.75 0 33.38 14.12Q298-597.75 298-578v396q0 19.75-13.62 33.37Q270.75-135 251-135h-69Z',
  sound:
    'M800-481q0-92-52-166.5T612-758q-14-5-19-18t2-27q6-14 20-19.5t29 .5q103 44 165 136t62 205q0 113-62 205T644-140q-15 6-29 .5T595-159q-7-14-2-27t19-19q84-35 136-109.5T800-481ZM264-335H137q-21 0-34.5-13.5T89-382v-196q0-20 13.5-34t34.5-14h127l155-154q22-23 51.5-11t29.5 43v535q0 32-29.5 44T419-180L264-335Zm427-145q0 53-27.5 96.5T586-316q-10 5-18-1t-8-17v-293q0-11 8-16.5t18-.5q50 24 77.5 68t27.5 96Z',
  mute: 'M687-167q-13 9-27 16.5T631-137q-14 7-28 .5T584-158q-4-10-1-20.5t11-17.5q12-4 22.5-9.5T637-219L492-367v154q0 32-29 44t-52-11L257-335H129q-20 0-33.5-13.5T82-382v-196q0-20 13.5-34t33.5-14h110L48-821q-11-11-10.5-25T49-871q11-11 25.5-11t25.5 11l747 762q11 11 11 25t-11 25q-11 12-26 12t-26-12L687-167Zm106-314q0-92-52-166.5T605-758q-14-5-19-18t2-27q6-14 20-19.5t29 .5q102 43 164.5 135T864-481q0 38-7.5 74T834-337q-9 20-22.5 24.5t-26.5-1q-13-5.5-20-17t-1-25.5q14-28 21-60t8-65ZM600-634q39 28 61.5 66.5T684-480q0 5-.5 11t-.5 11q-1 15-16 19.5t-27-8.5l-55-55q-7-7-10-15.5t-3-17.5v-82q0-12 9-17.5t19 .5Zm-221-80q-7-7-7-17t7-17l32-32q23-23 52-11t29 43v91q0 16-15 21.5t-26-5.5l-72-73Z',
  hint: 'M416.5-62.5Q390-91 390-133h180q0 42-26.54 70.5Q516.93-34 479.96-34 443-34 416.5-62.5ZM346.93-201q-15.91 0-25.92-10.39Q311-221.79 311-236.88q0-15.08 10.22-25.6Q331.45-273 347-273h267q15.13 0 25.06 10.52 9.94 10.52 9.94 25.6 0 15.09-9.94 25.49Q629.13-201 614-201H346.93ZM316-340q-72-47-116.5-117.79Q155-528.59 155-618q0-131.75 96.21-228.38Q347.41-943 479.71-943 612-943 709-846.38q97 96.63 97 228.38 0 89-44 160T644-340H316Z',
  addVial:
    'M447-440v130q0 15.3 10.18 25.65 10.17 10.35 26 10.35 15.82 0 25.82-9.92 10-9.93 10-26.33V-440h131q15.3 0 25.65-10.18 10.35-10.17 10.35-26 0-15.82-9.92-25.82-9.93-10-26.33-10H519v-138q0-15.3-10.18-25.65-10.17-10.35-26-10.35-15.82 0-25.82 9.92-10 9.93-10 26.33V-512H310q-15.3 0-25.65 10.18-10.35 10.17-10.35 26 0 15.82 9.92 25.82 9.93 10 26.33 10H447Zm33.4 385q-88.87 0-166.12-33.08-77.25-33.09-135.18-91.02-57.93-57.93-91.02-135.12Q55-391.41 55-480.36q0-88.96 33.08-166.29 33.09-77.32 90.86-134.81 57.77-57.48 135.03-91.01Q391.24-906 480.28-906t166.49 33.45q77.44 33.46 134.85 90.81t90.89 134.87Q906-569.34 906-480.27q0 89.01-33.53 166.25t-91.01 134.86q-57.49 57.62-134.83 90.89Q569.28-55 480.4-55Z',
  star: 'M480-241 292-127q-14 8-28 7t-25-9q-11-8-16-20.5t-2-28.5l50-214-166-145q-12-10-15.5-23.5t0-26.5q3.5-13 15-22t27.5-10l219-19 85-203q6-15 18.5-22t25.5-7q13 0 25.5 7t18.5 22l85 203 220 19q15 1 26.5 10t15 22q3.5 13 0 26.5T855-537L689-392l50 214q3 16-2 28.5T721-129q-11 8-25 9t-28-7L480-241Z',
  flame:
    'M145-400q0-114.65 71.5-225.82Q288-737 414-818q26-17 53.5-1.25T495-770v61.55q0 27.81 19.15 46.63Q533.3-643 561-643q15 0 27.98-6.47Q601.95-655.93 612-669q9.88-12.67 24.44-16.83Q651-690 664-682q70.13 50.03 110.57 124.01Q815-484 815-400.43q0 97.85-49 176.37Q717-145.55 636-104q26.31-27.76 40.15-63.74Q690-203.71 690-242.59q0-42.86-15.5-79.72t-45.3-66.52L480-534 333-389q-31 30-46.5 67.2-15.5 37.19-15.5 79.42 0 38.38 13.35 74.45Q297.69-131.85 324-104q-81-41.54-130-120.05-49-78.51-49-175.95Zm335-2 82 80.87q16 16.13 24.5 36.31Q595-264.64 595-243q0 46.77-33.68 79.89Q527.65-130 479.82-130q-47.82 0-81.32-33.11Q365-196.23 365-243q0-22 8.47-42.13Q381.94-305.27 399-321l81-81Z',
  eye: 'M600.5-379.62q49.5-49.62 49.5-120.5T600.38-620.5Q550.76-670 479.88-670T359.5-620.38Q310-570.76 310-499.88t49.62 120.38q49.62 49.5 120.5 49.5t120.38-49.62ZM412-432.18q-28-28.17-28-68Q384-540 412.18-568q28.17-28 68-28Q520-596 548-567.82q28 28.17 28 68Q576-460 547.82-432q-28.17 28-68 28Q440-404 412-432.18Zm-186.95 178Q110.1-331.35 42-454q-6-10.92-9-22.66-3-11.75-3-23.32t3-23.26q3-11.69 9-22.76 68.1-122.65 183.05-199.82Q340-823 480-823t254.95 77.18Q849.9-668.65 918-546q6 10.92 9 22.66 3 11.75 3 23.32t-3 23.26q-3 11.69-9 22.76-68.1 122.65-183.05 199.82Q620-177 480-177t-254.95-77.18Z',
  music:
    'M266.5-140.5Q218-189 218-259t48.5-118.5Q315-426 385-426q23 0 41 5.5t32 15.5v-416q0-20 13.5-34t33.5-14h191q20 0 33.5 14t13.5 34v75q0 20-13.5 33.5T696-699H552v440q0 70-48.5 118.5T385-92q-70 0-118.5-48.5Z',
  tap: 'M422-55q-42 0-79.42-17.17Q305.17-89.35 280-122L86-371q-13-18-10.9-39.09Q77.2-431.18 94-445l7-6q21.89-17.28 49.95-19.64Q179-473 205-460l78 39v-333q0-17.88 12.59-30.44Q308.18-797 326.09-797t30.41 12.56Q369-771.88 369-754v220h285q70.92 0 121.46 50.25Q826-433.5 826-363v145q0 68-48 115.5T662.45-55H422Zm35.51-578q-17.67 0-30.09-12.63Q415-658.26 415-676.24q0-6.76 6-21.76 7-12 11-26t4-29q0-46-32-78t-78-32q-46 0-78 32t-32 78q0 15 4 29t11 26q3 5 4.5 9.87 1.5 4.88 1.5 12.25 0 17.88-12.96 30.38T193.46-633q-13.46 0-23.96-6T154-656q-12-23-18.5-46.75t-6.5-50.4q0-81.85 57.31-139.35 57.32-57.5 139.5-57.5 82.19 0 139.69 57.42Q523-835.15 523-752.81q0 26.81-6.5 50.31Q510-679 498-656q-5 11-16 17t-24.49 6Z',
  vibrate:
    'M323-94q-40.21 0-67.61-27.63Q228-149.25 228-188v-583q0-40.21 27.39-67.61Q282.79-866 323-866h316q40.21 0 67.61 27.39Q734-811.21 734-771v583q0 38.75-27.39 66.37Q679.21-94 639-94H323Zm181.5-535.5Q515-640 515-655t-10.5-25.5Q494-691 479-691t-25.5 10.5Q443-670 443-655t10.5 25.5Q464-619 479-619t25.5-10.5ZM-37-401.38V-559q0-14.9 10.77-25.45Q-15.46-595-.23-595T25-584.88q10 10.13 10 26.26V-401q0 14.9-10.18 25.45Q14.65-365-.58-365q-15.23 0-25.82-10.13Q-37-385.25-37-401.38ZM95-313.2V-647q0-14.9 10.77-25.45 10.77-10.55 26-10.55T157-672.88q10 10.13 10 26.08V-313q0 14.9-10.18 25.45Q146.65-277 131.42-277q-15.23 0-25.82-10.13Q95-297.25 95-313.2Zm831-88.18V-559q0-14.9 10.18-25.45Q946.35-595 961.58-595q15.23 0 25.82 10.12 10.6 10.13 10.6 26.26V-401q0 14.9-10.77 25.45-10.77 10.55-26 10.55T936-375.13q-10-10.12-10-26.25ZM794-313.2V-647q0-14.9 10.18-25.45Q814.35-683 829.58-683q15.23 0 25.82 10.12Q866-662.75 866-646.8V-313q0 14.9-10.77 25.45-10.77 10.55-26 10.55T804-287.13q-10-10.12-10-26.07Z',
  bell: 'M182-175q-20 0-33.5-13.5T135-222q0-20 13.5-33.5T182-269h24v-279q0-93 53-168.5T403-812v-16q0-33 22.5-55.5T480-906q32 0 54.5 22.5T557-828v16q91 19 144.5 95T755-548v279h23q20 0 34 13.5t14 33.5q0 20-14 33.5T778-175H182ZM481-46q-37 0-63-26t-26-63h177q0 37-26 63t-62 26Z',
  palette:
    'M480-55q-87.04 0-164.52-33.5T180-180q-58-58-91.5-135.46Q55-392.92 55-479.93 55-569 88.5-647t92.43-135.74q58.93-57.73 137.93-90.5 79-32.76 168.7-32.76 83.47 0 159.25 28.46 75.78 28.45 133.49 79Q838-748 872-678.8q34 69.2 34 149.8 0 114-64 187t-178 73h-58q-16 0-28 13t-12 29q0 18 10 27t10 30q0 33-33.3 74T480-55ZM291-469q15-15 15-35t-15-35q-15-15-35-15t-35 15q-15 15-15 35t15 35q15 15 35 15t35-15Zm121.8-163.2q15.2-15.2 15.2-35.5t-15.2-34.8Q397.6-717 377.3-717t-34.8 14.5Q328-688 328-667.7q0 20.3 14.5 35.5t34.8 15.2q20.3 0 35.5-15.2Zm205 0q15.2-15.2 15.2-35.5t-15.2-34.8Q602.6-717 582.3-717t-34.8 14.5Q533-688 533-667.7q0 20.3 14.5 35.5t34.8 15.2q20.3 0 35.5-15.2ZM742-469q15-15 15-35t-15-35q-15-15-35.5-15t-35 15Q657-524 657-504t14.5 35q14.5 15 35 15t35.5-15Z',
  book: 'M512-222q50-25 98-37.5T712-272q38 0 78.5 6t69.5 16v-429q-34-18-72-25.5t-76-7.5q-54 0-104.5 16.5T512-649v427Zm-44.5 102.5Q459-121 452-126q-46-29-98.19-46-52.18-17-105.81-17-34.59 0-67.29 9.5Q148-170 115-159q-33 17-65.5-2.16T17-219v-462q0-25 11-46.2 11-21.2 33-32.8 44-18 90.5-27t94.39-9Q310-796 370-778.5T482-724q51-36 110-54t122.11-18q47.89 0 93.89 9.5t90 26.5q22 11.6 33.5 32.8Q943-706 943-681v473q0 37-33 53t-66-4q-32-12-64.71-21-32.7-9-67.29-9-53 0-102 17.5T516-126q-6 5-14.5 6.5t-17 1.5q-8.5 0-17-1.5ZM560-582q0-5.04 3.5-9.52Q567-596 572-599q30-11 61.5-17t66.5-6q22 0 43 2.57t41 7.67q6 1.06 11 7.27 5 6.22 5 12.49 0 12-7.5 17.5T774-572q-18-5-36-7.5t-38-2.5q-29 0-55.5 5T593-561q-14.88 5-23.94-1.17Q560-568.33 560-582Zm0 220q0-5.04 3.5-10.02Q567-377 572-380q30-11 61.5-16.5T700-402q22 0 43 2.57t41 7.67q6 1.06 11 7.27 5 6.22 5 12.49 0 12-7.5 17.5T774-352q-18-5-36-7.5t-38-2.5q-29 0-55.5 4.5T593-342q-14.88 5-23.94-.15Q560-347.31 560-362Zm0-110q0-5.04 3.5-9.52Q567-486 572-489q30-11 61.5-17t66.5-6q22 0 43 2.57t41 7.67q6 1.06 11 7.27 5 6.22 5 12.49 0 12-7.5 17.5T774-462q-18-5-36-7.5t-38-2.5q-29 0-55.5 5T593-451q-14.88 5-23.94-1.17Q560-458.33 560-472Z',
  shield:
    'M464.5-61.5Q457-63 450-66q-144-47-229.5-177.5T135-523v-189q0-30 16.5-55t44.5-35l251-94q16-6 33-6t33 6l251 94q28 10 45 35t17 55v189q0 149-86 279.5T510-66q-7 3-14.5 4.5T480-60q-8 0-15.5-1.5Z',
  coin: 'M480.14-55Q392-55 314.5-88 237-121 179-179T88-314.36q-33-77.36-33-165.5Q55-569 88-646.5q33-77.5 90.84-135.05 57.85-57.56 135.28-91Q391.56-906 479.78-906q89.22 0 166.84 33.37t135.09 90.79q57.48 57.42 90.89 134.96Q906-569.34 906-480q0 88.28-33.45 165.76-33.44 77.48-91 135.36Q724-121 646.64-88q-77.36 33-166.5 33Zm21.96-146q9.9-8 9.9-24v-16q59-6 94-39.5t35-90.46q0-54.27-29.5-87.15Q582-491 509.55-514 448-535 426-555t-22-51.59q0-26.58 20-41.5Q444-663 478-663q24 0 42.5 8.5t33 27.5q9.5 11 22 12.5T599-620q13-8 15.5-20.5T609-665q-18-24-40.5-36.97Q546-714.94 514-720v-15q0-17-10.4-24t-22.6-7q-12.2 0-23.1 7-10.9 7-10.9 24v15q-54 9-82 40.57t-28 76.04Q337-551 365.5-520T472-460q61 23 81.5 41t20.5 48q0 30.03-23.5 51.02Q527-299 487-299q-31.63 0-57.65-14.5Q403.34-328 389-355q-7-11-17.5-16.5T349-373q-16 6-20 19.5t5 26.5q21 35 49 55.5t62 28.5v18q0 14 10.4 23t23.6 9q13.2 0 23.1-8Z',
  /** A vial. The app's own mark, used where the drawer names the game. */
  vial: 'M480-55q-93 0-157.5-65.5T258-280v-335q-35-7-59-32t-24-60v-103q0-40 29.5-68t70.5-28h411q41 0 70.5 28t29.5 68v103q0 35-24.5 60T703-615v335q0 94-65 159.5T480-55Zm96.5-127.33Q616-222.67 616-280v-20H509q-16.75 0-27.87-11.68Q470-323.35 470-340.18q0-16.82 11.13-28.32Q492.25-380 509-380h107v-77H509q-16.75 0-27.87-11.68Q470-480.35 470-497.18q0-16.82 11.13-28.32Q492.25-537 509-537h107v-75H345v332q0 57.33 38.76 97.67 38.77 40.33 96 40.33 57.24 0 96.74-40.33Z',
  /** The drawer handle in the top bar. `menu`, not a bespoke three-rule glyph. */
  menu: 'M142-203q-19.75 0-33.37-13.68Q95-230.35 95-250.68q0-20.32 13.63-33.82Q122.25-298 142-298h676q19.75 0 33.88 13.68 14.12 13.67 14.12 34 0 20.32-14.12 33.82Q837.75-203 818-203H142Zm0-230q-19.75 0-33.37-13.68Q95-460.35 95-480.18q0-19.82 13.63-33.32Q122.25-527 142-527h676q19.75 0 33.88 13.68Q866-499.65 866-479.82q0 19.82-14.12 33.32Q837.75-433 818-433H142Zm0-229q-19.75 0-33.37-13.68Q95-689.35 95-709.68q0-20.32 13.63-33.82Q122.25-757 142-757h676q19.75 0 33.88 13.68 14.12 13.67 14.12 34 0 20.32-14.12 33.82Q837.75-662 818-662H142Z',
  close:
    'M480-414 282-216q-14 14-33 14t-33-14q-14-14-14-33t14-33l198-198-198-198q-14-14-14-33t14-33q14-14 33-14t33 14l198 198 198-198q14-14 33-14t33 14q14 14 14 33t-14 33L546-480l198 198q14 14 14 33t-14 33q-14 14-33 14t-33-14L480-414Z',
  /** "Get more of this." The shortcut on the coin pill, and nothing else yet. */
  plus: 'M433-433H235q-19.75 0-33.37-13.68Q188-460.35 188-480.68q0-20.32 13.63-33.82Q215.25-528 235-528h198v-198q0-19.75 13.68-33.87Q460.35-774 480.68-774q20.32 0 33.82 14.13Q528-745.75 528-726v198h198q19.75 0 33.88 13.68Q774-500.65 774-480.32q0 20.32-14.12 33.82Q745.75-433 726-433H528v198q0 19.75-13.68 33.88Q500.65-188 480.32-188q-20.32 0-33.82-14.12Q433-216.25 433-236v-197Z',
  /**
   * The disclosure mark on a row that opens a list beneath itself.
   *
   * Down rather than the row chevron's right, because the two mean different
   * things: `chevron` says the row leads somewhere else, this says the row
   * unfolds in place. A right-pointing mark on a control that expands downward
   * promises a screen that never arrives.
   */
  expand:
    'M462-343q-9-4-16-11L249-551q-14-14-13.5-33.5T250-618q14-14 33.5-14t33.5 14l163 164 164-164q14-14 33-13.5t33 14.5q14 14 14 33.5T710-550L514-354q-7 7-16 11t-18 4q-9 0-18-4Z',
  info: 'M512-280.79q12-11.79 12-29.21v-169q0-17.42-11.96-29.21-11.97-11.79-29-11.79Q466-520 454-508.21T442-479v169q0 17.42 11.96 29.21 11.97 11.79 29 11.79Q500-269 512-280.79Zm2-311.72q14-13.52 14-33.49 0-21.95-13.79-35.47Q500.41-675 480.02-675q-21.52 0-34.77 13.53Q432-647.95 432-626.5q0 20.6 14.07 34.05 14.07 13.45 34 13.45T514-592.51ZM480.4-55q-88.87 0-166.12-33.08-77.25-33.09-135.18-91.02-57.93-57.93-91.02-135.12Q55-391.41 55-480.36q0-88.96 33.08-166.29 33.09-77.32 90.86-134.81 57.77-57.48 135.03-91.01Q391.24-906 480.28-906t166.49 33.45q77.44 33.46 134.85 90.81t90.89 134.87Q906-569.34 906-480.27q0 89.01-33.53 166.25t-91.01 134.86q-57.49 57.62-134.83 90.89Q569.28-55 480.4-55Z',
  /** The rewarded-ad slot: a screen with a play head, not a bare triangle. */
  /**
   * Softer corners than Material ships.
   *
   * The body's own radius is about 94 in this 960 grid, which at 15dp on a
   * button draws as a near-square — sharp against a row of pill-shaped buttons
   * and a card cornered at 20.
   *
   * Settled at 200, a little under a third of the body's height. Two earlier
   * attempts looked unchanged on device and neither was a geometry problem —
   * `Icon` parses each glyph once into a module-level `Map`, so a Fast Refresh
   * that does not re-execute this file keeps the `SkPath` built at launch. Half
   * the height, tried next, drew as a lozenge with a dot in it: a play button,
   * not a screen. **Reload fully when changing one of these** or the next
   * three edits will each look like nothing happening.
   *
   * The play triangle is scaled about 1.15 from Material's, about its own
   * centre. Rounding the body's corners moved its edges inward, so the same
   * triangle read smaller inside it — the glyph needs the mark to hold the
   * middle, not the frame.
   *
   * The triangle stays a second sub-path wound the opposite way to the body,
   * which is what knocks it out of the fill. Redrawing either one in the same
   * direction fills the icon solid.
   */
  video:
    'm414-309 232-152q12-8 12-21t-12-21L414-655q-13-9-26-1t-14 23v301q0 15 13 22t27 1ZM255-135q-82.79 0-141.4-58.6Q55-252.21 55-335v-291q0-82.79 58.6-141.4Q172.21-826 255-826h451q82.79 0 141.4 58.6Q906-708.79 906-626v291q0 82.79-58.6 141.4Q788.79-135 706-135H255Z',
  clock:
    'M524-498.45V-648q0-17.67-11.79-29.34-11.79-11.66-29-11.66T454-677.34q-12 11.67-12 29.34v166q0 9 3 16.86 3 7.85 9 15.14l132 137q13.27 13 30.63 12.5Q634-301 647-313t13-30q0-18-13-31L524-498.45ZM480.14-55Q392-55 314.62-88.37q-77.37-33.36-135.11-91.06-57.73-57.7-91.12-135.03Q55-391.78 55-479.89q0-88.11 33.58-165.6 33.59-77.48 91.02-134.91 57.43-57.43 134.82-91.52Q391.81-906 480-906q88.19 0 165.58 34.08 77.39 34.09 134.82 91.52 57.43 57.43 91.52 134.82Q906-568.19 906-480q0 88.19-34.08 165.58-34.09 77.39-91.52 134.82-57.43 57.43-134.77 91.02Q568.28-55 480.14-55Z',
} as const;

/**
 * Glyphs that are another glyph mirrored, rather than a path of their own.
 *
 * The stage pager used to run `back` against `next` — a bare chevron opposite
 * an arrow with a shaft, two glyphs for one axis of travel sitting 100dp apart
 * on the same row. `next` is the one that stays: an arrow reads as "the next
 * page of these" where a chevron reads as "out of here", which is the header
 * back button's job and the reason `back` cannot double as the pager's left.
 *
 * Mirrored rather than pasted as a second path. Material's `arrow_back` is
 * `arrow_forward` reflected, so transcribing it is a second copy of one shape
 * that can drift from the first — and a reflection is exact where a
 * transcription is only careful.
 */
const MIRRORED = {
  prev: 'next',
  // The row-affordance chevron. `back` is already a bare left chevron, and a
  // "there is more behind this" mark is the same shape pointing the other way.
  chevron: 'back',
} as const satisfies Record<string, keyof typeof ICONS>;

export type IconName = keyof typeof ICONS | keyof typeof MIRRORED;

/**
 * Parsed paths, shared across every instance and every mount.
 *
 * An `SkPath` is a native object; parsing per component meant one allocation
 * per icon per mount, and the nav bar alone mounts five. They are immutable
 * here — nothing scales or transforms the path itself, only the canvas — so
 * one copy per glyph is safe to share.
 */
const PATHS = new Map<IconName, ReturnType<typeof Skia.Path.MakeFromSVGString>>();

function iconPath(name: IconName) {
  let path = PATHS.get(name);
  if (path === undefined) {
    const mirrored = name in MIRRORED;
    const source = mirrored ? MIRRORED[name as keyof typeof MIRRORED] : name;
    path = Skia.Path.MakeFromSVGString(ICONS[source as keyof typeof ICONS]);
    // Reflected about the grid's centre line: x' = 960 - x, y unchanged. The
    // matrix is stated row-major rather than composed from `translate` and
    // `scale` calls, whose pre- and post-multiply order is the easiest thing
    // here to get backwards — and a path mirrored about x = 0 lands entirely
    // off the canvas, which looks like a missing icon rather than a wrong one.
    //
    // Mutating in place is safe: this is a path parsed a line ago and not yet
    // in `PATHS`, so nothing else holds it. What gets cached is the mirrored
    // path, which is never transformed again.
    if (path && mirrored) {
      path.transform(Skia.Matrix([-1, 0, ICON_VIEWBOX, 0, 1, 0, 0, 0, 1]));
    }
    PATHS.set(name, path);
  }
  return path;
}

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon = memo(function Icon({
  name,
  size = 24,
  color = apothecary.ink,
}: IconProps) {
  const path = iconPath(name);
  // `transform` is a fresh array every render otherwise, which defeats the
  // memo on the Skia node below it.
  // Scale first, then lift the 960 grid's negative Y into the canvas. The
  // translate is in already-scaled space, which is why it is `size` and not
  // `ICON_VIEWBOX`.
  const transform = useMemo(
    () => [{ scale: size / ICON_VIEWBOX }, { translateY: ICON_VIEWBOX }],
    [size]
  );
  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  if (!path) return null;

  return (
    <Canvas style={canvasStyle}>
      <Group transform={transform}>
        {/* Always filled. The set has no outline variants here on purpose. */}
        <Path path={path} color={color} style="fill" />
      </Group>
    </Canvas>
  );
});

/** Gap between stars, as a fraction of one star's size. */
const STAR_GAP = 0.22;

/**
 * A three-star rating, drawn as stars rather than as dots.
 *
 * One canvas for all three, not three `Icon`s. A stage page holds 50 tiles and
 * every canvas is a native surface — 150 of them to draw six shapes each is the
 * kind of cost this project has already paid once, on Home's rack.
 *
 * Earned stars are filled gold; the rest are the same shape at low opacity, so
 * the row keeps its width and a player can see what is still on the table.
 */
export const Stars = memo(function Stars({
  filled,
  size,
  total = 3,
}: {
  /** How many are earned, 0 to `total`. */
  filled: number;
  /** One star's box. The row is wider by the gaps. */
  size: number;
  total?: number;
}) {
  const path = iconPath('star');
  const gap = size * STAR_GAP;
  const width = size * total + gap * (total - 1);

  const canvasStyle = useMemo(() => ({ width, height: size }), [width, size]);
  const scale = useMemo(() => size / ICON_VIEWBOX, [size]);

  if (!path) return null;

  return (
    <Canvas style={canvasStyle}>
      {Array.from({ length: total }, (_, i) => (
        <Group
          key={i}
          transform={[
            { translateX: i * (size + gap) },
            { scale },
            { translateY: ICON_VIEWBOX },
          ]}
        >
          <Path
            path={path}
            color={i < filled ? apothecary.gold : ui.emptyStar}
            style="fill"
          />
        </Group>
      ))}
    </Canvas>
  );
});
