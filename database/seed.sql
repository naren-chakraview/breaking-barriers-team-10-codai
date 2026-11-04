-- CodeAI adaptive learning: PostgreSQL seed data (Aurora Serverless v2).
-- Course 1 is the HTML Basics lesson, course 2 is the Hour of AI skill tree.
-- Run after schema.sql. Generated from html-lesson.txt and sample-data.md.
-- Rows marked Authored in sample-data.md (levels, MCQs, examples, descriptors,
-- second student) were written for the hackathon and still need review.

SET TIME ZONE 'UTC';

BEGIN;

-- COURSE: 1 rows
INSERT INTO COURSE (CourseId, CourseTitle) VALUES (1, 'Web Development Foundations');

-- COMPETENCE_LEVELS_MASTER: 5 rows
INSERT INTO COMPETENCE_LEVELS_MASTER (LevelId, LevelName, Rubric, ThresholdInMCQ) VALUES (0, 'None', 'No evidence yet. The student has not attempted the skill.', 0);
INSERT INTO COMPETENCE_LEVELS_MASTER (LevelId, LevelName, Rubric, ThresholdInMCQ) VALUES (1, 'Beginner', 'Recognises some elements but makes frequent structural mistakes.', 25);
INSERT INTO COMPETENCE_LEVELS_MASTER (LevelId, LevelName, Rubric, ThresholdInMCQ) VALUES (2, 'Competent', 'Uses the right elements most of the time. Needs support on details. (Source band: developing.)', 50);
INSERT INTO COMPETENCE_LEVELS_MASTER (LevelId, LevelName, Rubric, ThresholdInMCQ) VALUES (3, 'Expert', 'Applies the skill correctly and explains the choice. (Source band: mastered.)', 80);
INSERT INTO COMPETENCE_LEVELS_MASTER (LevelId, LevelName, Rubric, ThresholdInMCQ) VALUES (4, 'Master', 'Applies the skill flawlessly and goes deeper on the same objective.', 100);

-- SKILLS: 6 rows
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (1, 1, 'Page Skeleton', 'Doctype, the html element, head vs body, the title element and closing tags.', 'Explain that HTML describes the structure and meaning of content, not its appearance. Build a valid page and mark up text, lists, links and images with the right elements.');
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (2, 1, 'Headings, Paragraphs and Emphasis', 'The h1 to h6 hierarchy, p, strong vs b, em vs i, and meaning vs appearance.', 'Explain that HTML describes the structure and meaning of content, not its appearance. Build a valid page and mark up text, lists, links and images with the right elements.');
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (3, 1, 'Lists', 'ul, ol, li and nesting.', 'Build a valid page and mark up text, lists, links and images with the right elements.');
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (4, 1, 'Links', 'The a element, href, absolute vs relative URLs and descriptive link text.', 'Build a valid page and mark up text, lists, links and images with the right elements.');
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (5, 1, 'Images and Alt Text', 'img, src, alt text and decorative images.', 'Build a valid page and mark up text, lists, links and images with the right elements.');
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (6, 1, 'Semantic Page Layout', 'header, nav, main, section, footer, and div vs semantic elements.', 'Choose semantic elements to organize a page into meaningful regions.');

-- SKILL_TIER_CONTENT: 18 rows
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (1, 1, 'core', 'Your first page', 'Build a page whose browser tab says ''My First Page'' and whose body shows the text ''Hello, world!''.', '<!-- Start here -->
', '1) Every HTML page starts with a doctype, then an html element. 2) Inside html you need two parts: head (info about the page) and body (what people see). 3) Put <title> inside <head>, and your greeting inside <body>.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (2, 1, 'support', 'Fix the broken skeleton', 'This page has three mistakes. Find and fix them so the tab title shows ''Fix Me'' and the page shows a greeting.', '<html>
<body>
<title>Fix Me</title>
Hello there
</html>
', '1) Look at where the title is placed. Does it belong in the body? 2) The first line of a modern page is a doctype. Also check the body closing tag.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (3, 1, 'depth', 'Page metadata', 'Add lang, charset and viewport settings, then add a comment explaining what each one does for users or browsers.', '<!DOCTYPE html>
<html>
<head>
<title>My Page</title>
</head>
<body>
<p>Hello</p>
</body>
</html>
', '1) lang goes on the html element. 2) charset and viewport are meta elements inside head.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (4, 2, 'core', 'Write a short bio', 'Write a bio with your name as the main heading, an ''About me'' subheading, and two paragraphs. Make one important phrase stand out.', '<body>

</body>
', '1) The page title text is the h1. Sections under it use h2. 2) Each paragraph gets its own p element. 3) Use strong for something important, em for stress.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (5, 2, 'support', 'Fix the heading sizes', 'This page uses headings to get bigger text. Restructure it so the headings follow a proper outline.', '<h1>My Pet</h1>
<h4>About</h4>
<p>Max is a dog.</p><br><br><h2>Food</h2>
<p>He likes bones.</p>
', '1) Headings describe structure. ''About'' is a section of the page, so which level fits? 2) Replace the double br with separate p elements.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (6, 2, 'depth', 'Outline an article', 'Structure a three-level article outline (title, sections, subsections) and justify each emphasis choice in a comment.', '<body>
<!-- Topic: How plants make food -->
</body>
', '1) Subsections use h3 under an h2. 2) Add a comment before each strong or em explaining why.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (7, 3, 'core', 'Favorites and steps', 'Create a list of your 3 favorite foods and a numbered list of 4 steps to make a sandwich.', '<body>

</body>
', '1) Use ul when order does not matter and ol when it does. 2) Each item is an li inside the list.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (8, 3, 'support', 'Turn dashes into a list', 'Convert this fake list into a real one.', '<p>- apples</p>
<p>- bananas</p>
<p>- grapes</p>
', '1) Wrap all the items in one ul. 2) Each line becomes an li; remove the dash.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (9, 3, 'depth', 'A nested menu', 'Build a restaurant menu with categories and items nested inside them.', '<body>
<h1>Menu</h1>
</body>
', '1) A nested list lives inside an li of the parent list. 2) Decide: do menu items need an order?');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (10, 4, 'core', 'Link to the world', 'Add a link to a website you like and a link to another page called about.html.', '<body>
<p>My favorite site:</p>
</body>
', '1) Links use the a element with an href attribute. 2) External sites need the full address starting with https://. 3) Link text should say where it goes, not ''click here''.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (11, 4, 'support', 'Repair the links', 'Three links are broken or unclear. Fix them.', '<a>Visit Wikipedia</a>
<a href="wikipedia.org">Click here</a>
<a href="about.html">About</a>
', '1) The first link is missing something that tells the browser where to go. 2) The second needs the protocol and better text.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (12, 4, 'depth', 'Jump within a page', 'Add a table of contents that jumps to sections of the same page, plus an email link.', '<body>
<h2>Intro</h2>
<p>...</p>
<h2>Details</h2>
<p>...</p>
</body>
', '1) Give each heading an id, then link to #thatid. 2) Email links use href starting with mailto:.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (13, 5, 'core', 'Add a picture', 'Add the provided image of a golden retriever to the page with helpful alt text.', '<body>
<!-- image: dog.jpg -->
</body>
', '1) img is a self-closing element with a src attribute. 2) alt text should describe what the picture shows.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (14, 5, 'support', 'Write better alt text', 'Each image below has weak alt text. Rewrite them for the context given in the comments.', '<!-- Blog post about hiking -->
<img src="trail.jpg" alt="trail.jpg">
<img src="summit.jpg" alt="image">
', '1) Imagine describing the photo to a friend over the phone. 2) Keep it short and specific.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (15, 5, 'depth', 'Figures and decorative images', 'Use figure and figcaption for one image, and decide which image is purely decorative and give it empty alt.', '<body>
<!-- logo.png (decorative divider), chart.png (shows sales growth) -->
</body>
', '1) figcaption gives a visible caption; alt is for non-visual users. 2) Decorative images use alt with an empty value.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (16, 6, 'core', 'Rescue the div soup', 'Replace the generic divs with header, nav, main, section and footer.', '<div class="top">My Site</div>
<div class="menu"><a href="/">Home</a> <a href="/about">About</a></div>
<div class="content"><div class="part"><h2>News</h2><p>...</p></div></div>
<div class="bottom">2026</div>
', '1) Ask what each div does: banner, menu, main content, footer? 2) A page has one main. Parts inside it can be sections. 3) Navigation links go inside nav.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (17, 6, 'support', 'Match the tag to the job', 'Fill in the blank tag names for each region, then check your page.', '<___>Site title</___>
<___><a href="/">Home</a></___>
<___><p>Main content</p></___>
<___>Contact info</___>
', '1) Choose from header, nav, main, footer. 2) Top of page is header; bottom is footer.');
INSERT INTO SKILL_TIER_CONTENT (TierContentId, SkillId, Tier, Title, Instructions, StarterCode, Hints) VALUES (18, 6, 'depth', 'Article or section?', 'Build a news page with two independent stories. Decide where article, section and aside belong, and label two navs if you add a second.', '<body>
<!-- Two stories, a sidebar of related links -->
</body>
', '1) article stands on its own; section groups related content. 2) Multiple navs need an aria-label to tell them apart.');

-- SKILL_RUBRIC_CRITERIA: 21 rows
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (1, 1, 'Document starts with a doctype', 0.2, 'dom', '{"selector":"document","assert":"doctype_exists"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (2, 1, 'html contains exactly one head and one body, in that order', 0.3, 'dom', '{"selector":"html","assert":"children_in_order","order":["head","body"]}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (3, 1, 'Title is non-empty and inside head', 0.25, 'dom', '{"selector":"head > title","assert":"text_not_empty"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (4, 1, 'Body contains visible content', 0.25, 'dom', '{"selector":"body","assert":"text_not_empty"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (5, 2, 'Exactly one h1', 0.2, 'dom', '{"selector":"h1","assert":"count_equals","value":1}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (6, 2, 'Heading levels do not skip (h1 then h2, not h4)', 0.3, 'dom', '{"selector":"h1,h2,h3,h4,h5,h6","assert":"no_skipped_levels"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (7, 2, 'Text blocks use p, not repeated br', 0.25, 'dom', '{"selector":"br + br","assert":"count_equals","value":0}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (8, 2, 'Emphasis (strong/em) marks meaning, not just looks', 0.25, 'llm', '{"judge_focus":"Is strong/em used for importance or stress rather than decoration?"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (9, 3, 'Every li is a direct child of ul or ol', 0.35, 'dom', '{"selector":"li","assert":"parent_in","parents":["ul","ol"]}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (10, 3, 'At least one ul and one ol are used', 0.3, 'dom', '{"selector":"ul, ol","assert":"count_at_least","value":2}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (11, 3, 'Ordered list is used for a real sequence, unordered for a set', 0.35, 'llm', '{"judge_focus":"Does each list type match whether order matters?"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (12, 4, 'Every a has an href', 0.3, 'dom', '{"selector":"a","assert":"has_attribute","attribute":"href"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (13, 4, 'External links use full https:// URLs', 0.3, 'dom', '{"selector":"a[href^=''http'']","assert":"attribute_matches","attribute":"href","pattern":"^https://"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (14, 4, 'Link text describes the destination', 0.4, 'llm', '{"judge_focus":"Would the link text make sense read alone?"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (15, 5, 'Every img has src', 0.3, 'dom', '{"selector":"img","assert":"has_attribute","attribute":"src"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (16, 5, 'Every img has an alt attribute', 0.3, 'dom', '{"selector":"img","assert":"has_attribute","attribute":"alt"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (17, 5, 'Alt text describes the image''s purpose in context', 0.4, 'llm', '{"judge_focus":"Does alt convey what a sighted user gets from the image?"}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (18, 6, 'Uses header, main and footer', 0.3, 'dom', '{"selector":"header, main, footer","assert":"count_at_least","value":3}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (19, 6, 'Exactly one main', 0.2, 'dom', '{"selector":"main","assert":"count_equals","value":1}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (20, 6, 'nav contains links', 0.25, 'dom', '{"selector":"nav a","assert":"count_at_least","value":1}');
INSERT INTO SKILL_RUBRIC_CRITERIA (CriterionId, SkillId, Description, Weight, Method, CheckSpec) VALUES (21, 6, 'Element choices match the meaning of each region', 0.25, 'llm', '{"judge_focus":"Is each region marked up with the element that describes its role?"}');

-- SKILL_LEVEL_DESCRIPTOR: 30 rows
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (1, 0, 'Has not written a page, or writes text with no html, head or body structure.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (1, 1, 'Writes html and body but leaves out the doctype or head, or puts the title in the body.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (1, 2, 'Builds the full skeleton but still misses a detail, such as a closing tag or an empty title.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (1, 3, 'Builds a valid document with doctype, head, title and body without help.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (1, 4, 'Builds a valid document, adds metadata such as lang, charset and viewport, and explains what each does.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (2, 0, 'Puts all text in the body with no headings or paragraphs.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (2, 1, 'Uses headings for size, skips levels, or uses repeated br instead of paragraphs.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (2, 2, 'Uses one h1 and paragraphs but still skips a heading level or uses b and i for importance.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (2, 3, 'Builds a correct heading outline with p, and uses strong and em for meaning.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (2, 4, 'Builds a three-level outline and justifies each emphasis choice.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (3, 0, 'Writes list items as plain lines or paragraphs.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (3, 1, 'Fakes lists with dashes in paragraphs, or places li outside a list.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (3, 2, 'Wraps items in a real list but picks ul or ol without regard to order.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (3, 3, 'Uses ul for sets and ol for sequences, with li as direct children.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (3, 4, 'Nests lists correctly and explains whether order matters for each list.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (4, 0, 'Writes link text with no a element.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (4, 1, 'Writes a elements without href, or with vague text like ''click here''.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (4, 2, 'Adds href to every link but leaves out https:// on external links.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (4, 3, 'Writes working absolute and relative links with descriptive text.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (4, 4, 'Also links within a page using ids and creates mailto links.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (5, 0, 'Does not add images, or does not know the img element.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (5, 1, 'Adds img but leaves out alt, or uses the file name as alt text.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (5, 2, 'Adds src and alt, but the alt text is generic or wrong for the context.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (5, 3, 'Embeds images with a correct src and alt text that describes them in context.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (5, 4, 'Also uses figure and figcaption, and gives decorative images an empty alt.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (6, 0, 'Builds a page entirely from div elements.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (6, 1, 'Uses a few semantic elements but still relies mostly on div, or uses more than one main.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (6, 2, 'Uses header, main and footer, but nav has no links or elements do not match their role.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (6, 3, 'Marks up header, nav with links, one main, sections and footer correctly.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (6, 4, 'Chooses between article, section and aside correctly and labels multiple navs.');

-- MCQ_QUESTIONS: 12 rows
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (1, 1, 'Where does the title element belong in an HTML page?', 'Inside head,Inside body,Before the doctype,Anywhere on the page', 'Inside head');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (2, 1, 'Which part of an HTML page holds the content people see in the page?', 'head,body,title,doctype', 'body');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (3, 2, 'Your page has an h1. Which heading should start the next section under it?', 'h2,h4,h6,Another h1', 'h2');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (4, 2, 'Which element marks a phrase as important?', 'strong,b,br,i', 'strong');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (5, 3, 'Which list fits the steps to make a sandwich?', 'An ordered list (ol),An unordered list (ul),Paragraphs that start with dashes,A set of div elements', 'An ordered list (ol)');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (6, 3, 'Which elements can be the direct parent of an li?', 'ul or ol,p or div,body,h1', 'ul or ol');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (7, 4, 'Which link text is best?', 'Click here,Read the Wikipedia article on bees,Link,Go', 'Read the Wikipedia article on bees');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (8, 4, 'Which href correctly links to an outside website?', 'https://www.wikipedia.org,wikipedia.org,www.wikipedia,//wiki', 'https://www.wikipedia.org');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (9, 5, 'What should alt text do?', 'Describe what the image shows in context,Repeat the file name,Say the word image,Stay blank on every image', 'Describe what the image shows in context');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (10, 5, 'Which attribute tells the browser where the image file is?', 'src,alt,href,title', 'src');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (11, 6, 'How many main elements should a page have?', 'Exactly one,One per section,As many as needed,None', 'Exactly one');
INSERT INTO MCQ_QUESTIONS (QuestionId, SkillId, MCQQuestion, PossibleAnswers, CorrectAnswer) VALUES (12, 6, 'What belongs inside a nav element?', 'Links to other pages or sections,Plain text only,The page footer,Images only', 'Links to other pages or sections');

-- LEARNING_EXAMPLES: 12 rows
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (1, 1, '<!DOCTYPE html>
<html lang="en">
<head>
  <title>My First Page</title>
</head>
<body>
  <p>Hello, world!</p>
</body>
</html>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (2, 1, '<!-- WRONG: no doctype, title inside body, body not closed -->
<html>
<body>
<title>Fix Me</title>
Hello there
</html>

<!-- RIGHT -->
<!DOCTYPE html>
<html>
<head>
  <title>Fix Me</title>
</head>
<body>
  <p>Hello there</p>
</body>
</html>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (3, 2, '<h1>Maya Lopez</h1>
<h2>About me</h2>
<p>I like building things on the web.</p>
<p>My <strong>favorite project</strong> is a <em>very</em> small garden app.</p>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (4, 2, '<!-- WRONG: h4 chosen for size, br used instead of paragraphs -->
<h1>My Pet</h1>
<h4>About</h4>
<p>Max is a dog.</p><br><br>

<!-- RIGHT -->
<h1>My Pet</h1>
<h2>About</h2>
<p>Max is a dog.</p>
<p>He likes bones.</p>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (5, 3, '<h2>Favorite foods</h2>
<ul>
  <li>Pizza</li>
  <li>Mango</li>
  <li>Rice</li>
</ul>

<h2>Make a sandwich</h2>
<ol>
  <li>Get two slices of bread</li>
  <li>Add the filling</li>
  <li>Close the sandwich</li>
  <li>Cut it in half</li>
</ol>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (6, 3, '<!-- WRONG: fake list built from paragraphs -->
<p>- apples</p>
<p>- bananas</p>
<p>- grapes</p>

<!-- RIGHT -->
<ul>
  <li>apples</li>
  <li>bananas</li>
  <li>grapes</li>
</ul>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (7, 4, '<p>My favorite site is
  <a href="https://www.wikipedia.org">Wikipedia</a>.
</p>
<p>Read more <a href="about.html">about me</a>.</p>
<p><a href="#details">Jump to the details section</a></p>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (8, 4, '<!-- WRONG: no href, no protocol, vague text -->
<a>Visit Wikipedia</a>
<a href="wikipedia.org">Click here</a>

<!-- RIGHT -->
<a href="https://www.wikipedia.org">Visit Wikipedia</a>
<a href="https://www.wikipedia.org">Read the Wikipedia home page</a>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (9, 5, '<img src="dog.jpg" alt="A golden retriever lying on green grass">
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (10, 5, '<!-- WRONG: filename and generic word as alt text -->
<img src="trail.jpg" alt="trail.jpg">
<img src="summit.jpg" alt="image">

<!-- RIGHT: describes the photo in the context of a hiking blog -->
<img src="trail.jpg" alt="A narrow dirt trail winding up a pine-covered hill">
<img src="summit.jpg" alt="Two hikers cheering at the mountain summit">

<!-- Decorative image: empty alt so screen readers skip it -->
<img src="divider.png" alt="">
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (11, 6, '<header>
  <h1>My Site</h1>
</header>
<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>
<main>
  <section>
    <h2>News</h2>
    <p>Welcome to the news page.</p>
  </section>
</main>
<footer>
  <p>2026</p>
</footer>
');
INSERT INTO LEARNING_EXAMPLES (ExampleId, SkillId, Example) VALUES (12, 6, '<!-- WRONG: div soup, no landmarks -->
<div class="top">My Site</div>
<div class="menu"><a href="/">Home</a> <a href="/about">About</a></div>
<div class="content"><div class="part"><h2>News</h2><p>...</p></div></div>
<div class="bottom">2026</div>

<!-- RIGHT -->
<header>My Site</header>
<nav><a href="/">Home</a> <a href="/about">About</a></nav>
<main><section><h2>News</h2><p>...</p></section></main>
<footer>2026</footer>
');

-- ---------------------------------------------------------------------------
-- Course 2: Hour of AI 2026 - Adaptive (generated from database/sample-skilltree.json)
-- Skill ids 7, 8, 9 map to the tree skill slugs build, language, debug.
-- ---------------------------------------------------------------------------
-- COURSE: 1 row
INSERT INTO COURSE (CourseId, CourseTitle) VALUES (2, 'Hour of AI 2026 - Adaptive');
-- SKILLS: 3 rows
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (7, 2, 'Build with AI', 'Steering AI toward what you intend, and deciding what to do with what comes back.', 'Steer AI toward an intended design by writing specific prompts and refining them based on what comes back. Judge AI output against your own intent, and decide when to accept, redirect, or override it. Use the vocabulary of web design (hero, feature cards, interactive canvas, call-to-action) to analyze what makes a page effective and to describe what you want built. Describe a problem with enough context for AI to give a useful explanation and fix. Verify an AI-proposed fix before trusting it, confirming the problem is resolved and nothing new broke.');
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (8, 2, 'Language of web dev', 'Naming the parts of a page and understanding how they work.', 'Steer AI toward an intended design by writing specific prompts and refining them based on what comes back. Judge AI output against your own intent, and decide when to accept, redirect, or override it. Use the vocabulary of web design (hero, feature cards, interactive canvas, call-to-action) to analyze what makes a page effective and to describe what you want built. Describe a problem with enough context for AI to give a useful explanation and fix. Verify an AI-proposed fix before trusting it, confirming the problem is resolved and nothing new broke.');
INSERT INTO SKILLS (SkillId, CourseId, Title, Description, LessonObjective) VALUES (9, 2, 'Debug with AI', 'Describing a problem so AI can help, and checking that the fix worked.', 'Steer AI toward an intended design by writing specific prompts and refining them based on what comes back. Judge AI output against your own intent, and decide when to accept, redirect, or override it. Use the vocabulary of web design (hero, feature cards, interactive canvas, call-to-action) to analyze what makes a page effective and to describe what you want built. Describe a problem with enough context for AI to give a useful explanation and fix. Verify an AI-proposed fix before trusting it, confirming the problem is resolved and nothing new broke.');
-- SKILL_LEVEL_DESCRIPTOR (evidence levels of the tree skills)
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (7, 0, 'Writes vague one-line prompts with no goal, constraint or edge case, accepts whatever comes back, and cannot say why a prompt produced its result.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (7, 1, 'States a basic goal in the prompt, notices obvious mismatches with intent when they are visible or pointed out, and revises broadly, asking the AI to fix it or make it better.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (7, 2, 'Names a goal, a constraint and an edge case before generating, compares the output against intent to find specific matches and mismatches, and revises by naming the exact element or behavior to change, explaining why the prompt produced what it did.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (8, 0, 'Sees a site as one flat idea; sketches are decorative rather than structural, and recurring components go unrecognized even when pointed out.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (8, 1, 'Identifies basic components such as the nav bar, hero, cards and footer in an existing page when prompted, and fills in a heavily scaffolded wireframe or site map with inconsistent structure and no clear hierarchy.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (8, 2, 'Breaks a multi-page product into pages and components with a clear hierarchy, strips detail away to show structure only and can say why, and lays out a site map or wireframe that supports a plausible user flow with patterns applied consistently.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (8, 3, 'Anticipates navigation needs the task did not spell out, moves between site map and wireframe as a decision requires, and picks or adapts a layout pattern on purpose rather than defaulting to the first idea.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (9, 0, 'Avoids or dismisses error messages, cannot pick out the relevant part of one, and pastes whole code or applies any suggested fix without understanding it.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (9, 1, 'Reads an error when prompted but treats it as a stop sign, identifies the literal text without connecting it to the code, and pastes it to the AI with no context.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (9, 2, 'Treats an error as the start of a diagnosis, connects it to the line or element at fault and restates it in their own words, and gives the AI the error plus the intended behavior and what changed.');
INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES (9, 3, 'Tests deliberately to surface errors as feedback, predicts likely causes from prior bugs before reading the full message, and fixes the bug from the AI''s explanation, asking for a direct patch only as a check.');
-- CHECKPOINT: 19 rows
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('intro', 2, 'Intro', 'Intro panels', NULL, FALSE, TRUE, 1);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('steer-it', 2, 'Steer It', 'Writes a prompt with 2 or more specific details, or a follow-up that changes one thing.', NULL, TRUE, FALSE, 2);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('use-the-lingo', 2, 'Use the Lingo', 'Names a block of their page and what it is for.', NULL, TRUE, FALSE, 3);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('keep-or-redirect', 2, 'Keep or Redirect', 'Compares what came back with a plan and decides: keep, redirect or edit.', NULL, FALSE, FALSE, 4);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('give-context', 2, 'Give Context', 'Reports a problem with what was expected, what happened and where.', NULL, TRUE, FALSE, 5);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('check-the-fix', 2, 'Check the Fix', 'Checks that a fix worked and that nothing new broke.', NULL, FALSE, FALSE, 6);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('a-list-and-a-random-pick', 2, 'A list and a random pick', 'Describes a list of options and a random pick, using list and pick words, so the page chooses one by chance.', 'Interactive Elements', FALSE, FALSE, 7);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('a-number-and-a-rule', 2, 'A number and a rule', 'Describes a number that changes and a rule that uses it.', 'Interactive Elements', FALSE, FALSE, 8);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('remember-and-show', 2, 'Remember and show', 'Describes what the page should remember and what should show on screen.', 'Interactive Elements', FALSE, FALSE, 9);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('layout-and-spacing', 2, 'Layout and spacing', 'Uses layout words and block names to describe space, alignment and order.', 'Style & Design', FALSE, FALSE, 10);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('style-and-consistency', 2, 'Style and consistency', 'Names a style in words and restates it across changes so the AI keeps it steady.', 'Style & Design', FALSE, FALSE, 11);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('readable-and-clear', 2, 'Readable and clear', 'Asks for text size, contrast and wording that make a block easy to read.', 'Style & Design', FALSE, FALSE, 12);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('say-it-in-your-voice', 2, 'Say it in your voice', 'Names a tone in words and restates it across changes so the AI keeps it steady.', 'Story & Message', FALSE, FALSE, 13);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('lead-with-the-point', 2, 'Lead with the point', 'Uses headline words to say what the site is for in the first line.', 'Story & Message', FALSE, FALSE, 14);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('make-the-ask-clear', 2, 'Make the ask clear', 'Writes a call-to-action with a clear verb and next step.', 'Story & Message', FALSE, FALSE, 15);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('read-the-console', 2, 'Read the console', 'Reads an error in the console and says where it points, so a problem report has the context the AI needs.', 'Under the Hood', FALSE, FALSE, 16);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('find-it-in-the-code', 2, 'Find it in the code', 'Finds the line for a named block and uses its name to say where a change belongs.', 'Under the Hood', FALSE, FALSE, 17);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('undo-to-find-the-cause', 2, 'Undo to find the cause', 'Undoes changes one at a time and checks after each, to verify what caused the problem.', 'Under the Hood', FALSE, FALSE, 18);
INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, Skippable, RouteAfterCompletion, Sequence) VALUES ('show-it-off', 2, 'Show it off', 'Looks back at their hour, writes a sentence about their site, and shares it.', NULL, FALSE, FALSE, 19);
-- CHECKPOINT_REQUIRES
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('steer-it', 'intro');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('use-the-lingo', 'intro');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('keep-or-redirect', 'steer-it');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('give-context', 'intro');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('check-the-fix', 'give-context');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('a-list-and-a-random-pick', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('a-number-and-a-rule', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('remember-and-show', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('layout-and-spacing', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('style-and-consistency', 'steer-it');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('readable-and-clear', 'keep-or-redirect');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('say-it-in-your-voice', 'steer-it');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('lead-with-the-point', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('make-the-ask-clear', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('read-the-console', 'give-context');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('find-it-in-the-code', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('undo-to-find-the-cause', 'check-the-fix');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('show-it-off', 'steer-it');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('show-it-off', 'use-the-lingo');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('show-it-off', 'keep-or-redirect');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('show-it-off', 'give-context');
INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES ('show-it-off', 'check-the-fix');
-- CHECKPOINT_TARGET (explicit target, else the default of 1 for each skill the checkpoint trains)
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('steer-it', 7, 2);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('use-the-lingo', 8, 2);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('keep-or-redirect', 7, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('give-context', 9, 2);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('check-the-fix', 9, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('a-list-and-a-random-pick', 8, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('a-number-and-a-rule', 8, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('remember-and-show', 8, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('layout-and-spacing', 8, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('style-and-consistency', 7, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('readable-and-clear', 7, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('say-it-in-your-voice', 7, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('lead-with-the-point', 8, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('make-the-ask-clear', 8, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('read-the-console', 9, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('find-it-in-the-code', 8, 1);
INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES ('undo-to-find-the-cause', 9, 1);
-- STEP
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('intro-panels', 'intro', 1, 'panels', 'Welcome', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-test-kickoff-f53be11d-a281-4bb0-a62e-c63389ee7dc6","imageUrl":"https://images.code.org/99d7f396c47a604d6ca01825a08c4ab2-Panel 1.png","text":"###Dream it. Describe it. Build it.","layout":"text-top-right"},{"key":"adaptive-test-kickoff-3e0098fb-b792-442e-ade6-acaf5400fbde","imageUrl":"https://images.code.org/ab398ff421cc49dda5ad4547c45ea4ce-Panel 2.png","text":"###Start with a vision. \nWho needs something, and what would you make for them? You’ll pick up the language of web developers as you build with AI.","layout":"text-bottom-right"},{"key":"adaptive-test-kickoff-a1596eb7-255e-4629-8dc8-a4a4dc65fd23","imageUrl":"https://images.code.org/c8d6eae80b0e56a0ff6f77049964a597-Panel 3.png","text":"###Spark your ideas.\nCheck out these examples then think about what YOU want to build!","layout":"text-bottom-right"},{"key":"adaptive-test-kickoff-5c85af8a-bed3-4276-8b1a-7c64cea8ae9b","imageUrl":"https://images.code.org/f1dc3032a40eb929d2182f0f1da7373d-Panel 4.png","text":"####Build it!\nIn this lesson, your path is unique. Share your idea and your coding experience, and your lesson shifts with every answer along the way.","layout":"text-bottom-right"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('intro-four-ways-there', 'intro', 2, 'level', 'Four Ways There', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-intro-four-ways-there"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('intro-plan', 'intro', 3, 'questions', 'Plan your website', FALSE, NULL, NULL, '{"questions":[{"id":101,"type":"freeResponse","text":"Explain a website you would like to make in this activity. What is the topic or theme of the site? Who is it for?"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('intro-starter', 'intro', 4, 'level', 'Your starter site', TRUE, 'Here is a first version of your site, built from your plan. Look it over, then continue.', NULL, '{"level":"adaptive-HoAI26-intro-starter","projectPrompt":"The first version of the student''s website, built from their plan: a hero with a headline that says what the site is for, one or two sections that fit the topic, and a call-to-action. Keep the look and feel simple, but appropriate for their given topic. It should feel clean but not overly polished."}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('intro-web-dev', 'intro', 5, 'questions', 'Intro - Diagnostic for web dev', FALSE, NULL, NULL, '{"questions":[{"id":102,"type":"MultipleChoiceQuestion","questionName":"intro-self-check","questionTitle":"Which sentence sounds most like you?","choices":[{"id":"a","text":"I’m new to this. I haven’t worked with website code before."},{"id":"b","text":"I know some of the basics, like headings, buttons, and links that make up a page."},{"id":"c","text":"I can describe how a page looks, like its colors, fonts, and layout."},{"id":"d","text":"I can describe how a page behaves, like what happens when someone clicks or types."}]},{"id":103,"type":"MultipleChoiceQuestion","questionName":"intro-knowledge-button","questionTitle":"You want a button that changes color when someone clicks it. Which instruction would work best?","choices":[{"id":"a","text":"Style the button with a blue background color."},{"id":"b","text":"Add a click event that changes the button’s color."},{"id":"c","text":"Make the button look better and work better."},{"id":"d","text":"Add a button element that says “Click me.”"},{"id":"e","text":"I’m not sure."}],"measures":{"skillId":"build","evidenceLevels":{"a":1,"b":2,"c":0,"d":1,"e":0}}},{"id":104,"type":"MultipleChoiceQuestion","questionName":"intro-knowledge-cards","questionTitle":"You want a page with a heading and three cards in a row. Which instruction would work best?","choices":[{"id":"a","text":"Add a heading and three cards."},{"id":"b","text":"Add an h1 and three div elements."},{"id":"c","text":"Add an h1, then place three cards side by side."},{"id":"d","text":"Use flexbox to lay out three card divs in a row."},{"id":"e","text":"I’m not sure."}],"measures":{"skillId":"language","evidenceLevels":{"a":1,"b":1,"c":2,"d":2,"e":0}}},{"id":105,"type":"MultipleChoiceQuestion","questionName":"intro-knowledge-error","questionTitle":"Your heading looks wrong, and everything after it is huge too. You open the code and see this:\n\n<h1>Panda Fan Club\n<p>Welcome to the club!</p>\n\nWhich instruction to the AI would work best?","choices":[{"id":"a","text":"It’s broken. Fix it."},{"id":"b","text":"Add a CSS rule to fix the heading color."},{"id":"c","text":"Update the click handler so the heading changes."},{"id":"d","text":"Close the h1 tag after “Panda Fan Club”."},{"id":"e","text":"I’m not sure."}],"measures":{"skillId":"debug","evidenceLevels":{"a":0,"b":1,"c":1,"d":2,"e":0}}}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('steer-it-video', 'steer-it', 1, 'panels', 'Steer the AI', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-steer-it-1-17995faf-a664-4414-bc98-7431cd3241ef","imageUrl":"https://images.code.org/aa8b5cb70a4fe5ba24c5ba9880d53f2e-Grayscale Landing Page in Purple Browser.png","text":"**A vague idea leads to a generic page.**\n\n---\nPrompt: “Make a website.”","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-steer-it-1-afd489af-a45b-446f-a338-ca930cab4beb","imageUrl":"https://images.code.org/64f79822328b16e1d68866256a57f3fe-Blue half-pipe browser illustration.png","text":"**Specific prompts create the page you pictured.**\n\n----\n\nPrompt: “Make a blue skate park page.”","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-steer-it-1-d8ddab96-9905-4f58-a542-c018b77acfb2","imageUrl":"https://images.code.org/795bc8795241cc3f1cc23979c78866ce-Blue half-pipe hero with split content.png","text":"**Add details to make your vision clearer.**\n\n---\n\nPrompt: “Enlarge the ramp image and pink button.”","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('steer-it-widget', 'steer-it', 2, 'level', 'The prompt dial', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-steer-it-2"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('steer-it-project', 'steer-it', 3, 'level', 'Steer your first version', TRUE, NULL, 'Task: In their own project, write a follow-up prompt that adds details or changes one thing.
Outline: Prompt: "What would you change first? Add a detail or change one thing, and say what to keep." The tutor reads the prompt.
Evidence: a prompt with 2 or more specific details, or a follow-up that changes one thing.', '{"level":"adaptive-HoAI26-steer-it-3"}', 'The project changed to match a prompt with two or more specific details, or a follow-up that changed one thing.', 7);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('use-the-lingo-video', 'use-the-lingo', 1, 'panels', 'Meet the page parts', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-use-the-lingo-4-0fabcd91-a15d-4eab-b9e0-a817bdb80c3c","imageUrl":"https://images.code.org/e96e3780990834ef3974ef3d80947dfb-adaptive-HoAI26-use-the-lingo-4-panel-1-63cc02fd-4ac4-46cf-a853-c80dd9d66f8b.png","text":"###Sections of a webpage\n\nWhen you name the section you want to work on it makes it easier to build with AI.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-use-the-lingo-4-d0f02545-840a-4370-95c5-1425103a1f5d","imageUrl":"https://images.code.org/6e27590f581e1959b18f5a8ea039ff1e-panda1.png","text":"###Hero Banner\n\nThe **hero** section introduces your page.","layout":"text-bottom-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-use-the-lingo-4-1774d6c3-2655-47d6-a5f8-adc23ff053d4","imageUrl":"https://images.code.org/52e6642b23f6181e5df952febf841421-row-09-PAN-2-refined.png","text":"###Feature Cards\n\nSmaller ''feature cards'' show key info or options.","layout":"text-bottom-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-use-the-lingo-4-7cf960b2-c941-4a0e-b99a-620e481caad4","imageUrl":"https://images.code.org/b28e0cbb266cd58f7823fe3a7231b354-row-10-PAN-3-refined.png","text":"###Interactive Canvas\nAn ''interactive canvas'' lets users play or create.","layout":"text-bottom-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-use-the-lingo-4-72392717-95fb-44d8-82e3-9599f4c8b802","imageUrl":"https://images.code.org/951d163dd70c6a286be2faf6a9343312-row-11-PAN-4-refined.png","text":"###Call-to-action\nA ''call-to-action'' button guides you to the next step.","layout":"text-bottom-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('use-the-lingo-widget', 'use-the-lingo', 2, 'level', 'Tap a block', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-use-the-lingo-5"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('use-the-lingo-project', 'use-the-lingo', 3, 'level', 'Name a block in your project', TRUE, NULL, 'Task: Ask the AI for a change that names one block of their page and says what it is for.
Outline: Prompt: "Pick one part of your page and ask for a change. Name it and say its job."
Evidence: a prompt that names a block and its job.', '{"level":"adaptive-HoAI26-use-the-lingo-6"}', 'A prompt asked for a change by naming one part of the page and saying what that part is for.', 8);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('keep-or-redirect-video', 'keep-or-redirect', 1, 'panels', 'Match your plan', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-keep-or-redirect-7-ba2c3be6-4712-4e3d-8016-69fd81ac9220","imageUrl":"https://images.code.org/8394606fbac99808bd9afa51ee0652b9-Planning a Web Page Layout-1.png","text":"###Start with a plan.\n\nDecide who your page is for, what belongs on it, and what visitors should be able to do.","layout":"text-top-right"},{"key":"adaptive-HoAI26-keep-or-redirect-7-4f32facc-9d3a-417d-8506-7b147ed7a6e3","imageUrl":"https://images.code.org/fc4ea1d7455395b59c82ec350ea55d76-Plan versus browser_ spot the mismatch-2.png","text":"####Compare the result to your plan.\n\nCheck the content, layout, and features. What matches? What’s missing or different?","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-keep-or-redirect-7-4e6e7a97-d8fc-4458-aa16-afc16e2b48c4","imageUrl":"https://images.code.org/c17aeb4d1f7e4d09059b1ae52991fac9-From wrong page to right layout-3.png","text":"###Keep what works.\n\nIf the page meets your goals and works when you test it, you can keep it as is.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-keep-or-redirect-7-4d59d49f-ef73-4664-89c5-db39ed61e775","imageUrl":"https://images.code.org/6488a63920af6623306bf319fbf54573-Plan matches the finished page-4.png","text":"####You decide what to keep!\n\nWrite a new prompt that explains what missed the mark, what to change, and what to keep.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('keep-or-redirect-widget', 'keep-or-redirect', 2, 'level', 'Plan versus result', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-keep-or-redirect-8"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('keep-or-redirect-project', 'keep-or-redirect', 3, 'level', 'Decide on a real change', TRUE, NULL, 'Task: Write a one-sentence plan for a part of their page, then decide what to do when the AI changes it.
Outline: First the student writes a one-sentence plan, such as "A friendly headline and the blue button." When the AI changes something, the tutor shows the plan beside the result and asks: "Does this match? Keep it, redirect it or edit it, and say why."
Evidence: a decision with a reason that refers to the plan.', '{"level":"adaptive-HoAI26-keep-or-redirect-9"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('give-context-video', 'give-context', 1, 'panels', 'Three questions', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-give-context-10-871d8e81-1266-415a-82b5-8330003b3e82","imageUrl":"https://images.code.org/fcfe80dab9c17c530f44230ca8fda3ff-Frustrated student faces a broken bakery gallery.png","text":"###“It’s not working.”\nMateo is building a website for his parents’ bakery, but the photos overlap. He tells AI, “It’s not working. Fix it.” After another try, the problem is still there.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-give-context-10-4436b64f-b9e2-4bbc-bfbd-5bb0738dd413","imageUrl":"https://images.code.org/c71394dfc04d1e494e3bac2d9785a58c-Imagined bakery site in a thought bubble.png","text":"###Get specific.\nHe tries again: “In the photo gallery, the pictures overlap. I want three equal-sized photos in one row, with space between them.”","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-give-context-10-b6791e81-fea9-4823-8167-2435ed557756","imageUrl":"https://images.code.org/cf2655e0b29a3fc3b50c867b592d8fdb-Student working beside a bakery website.png","text":"###Find the pattern.\nMateo checks the updated page. It works! He notices what helped: name the part, describe what happens, and explain what should happen. Then test the change.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('give-context-widget', 'give-context', 2, 'level', 'Build a bug report', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-give-context-11"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('give-context-project', 'give-context', 3, 'level', 'Report a problem in your project', TRUE, NULL, 'Task: When something breaks or looks wrong, report what they expected, what happened and where.
Outline: Needs a real problem. Prompt: "Tell the AI what you expected, what happened and where." If nothing breaks, the tutor may offer a safe problem (parked for engineering).
Evidence: what was expected, what happened and where, all in one message.', '{"level":"adaptive-HoAI26-give-context-12"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('check-the-fix-panels', 'check-the-fix', 1, 'panels', 'Trust, then check', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-check-the-fix-13-c5c452e3-25a6-4544-94f0-066465f9f381","imageUrl":"https://images.code.org/a133066140c9b8d68a3d01e1f787e83c-adaptive-HoAI26-check-the-fix-13-panel-1-2067aefc-63e9-4ee1-a206-624e0f178c7e.png","text":"After a fix, reload the page to see if the changes worked.","layout":"text-top-left"},{"key":"adaptive-HoAI26-check-the-fix-13-865ee2e4-fc00-4ef6-a6ff-c5f556d5a66d","imageUrl":"https://images.code.org/ace19efd2f34afa9f33dee9c18ba1c60-adaptive-HoAI26-check-the-fix-13-panel-2-043d2eea-94ea-4fa8-8b93-5b6426be27d4.png","text":"Click on every button and link. Make sure all interactive elements still work.","layout":"text-top-left"},{"key":"adaptive-HoAI26-check-the-fix-13-f3604f97-23aa-462d-8ff9-e9adf8b4a12c","imageUrl":"https://images.code.org/542886051630157fd45f85280de5b751-adaptive-HoAI26-check-the-fix-13-panel-3-053129bf-7835-4bb9-b09e-e8a97252f165.png","text":"Carefully check the entire page for any new problems or broken parts.","layout":"text-top-left"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('check-the-fix-check', 'check-the-fix', 2, 'questions', 'Before and after', FALSE, NULL, NULL, '{"questions":[{"id":115,"type":"MultipleChoiceQuestion","questionName":"check-the-fix-q1","questionTitle":"The AI says it fixed your broken button. You reload the page and the button works. Which two things should you do next?","choices":[{"id":"a","text":"Move on, since the button works now."},{"id":"b","text":"Click through the rest of the page."},{"id":"c","text":"Ask the AI to confirm that everything works."},{"id":"d","text":"Look for anything that changed or broke."},{"id":"e","text":"Start over from your first version."},{"id":"f","text":"Both B and D"},{"id":"g","text":"Both A and D"}],"correctChoiceId":"f"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('check-the-fix-project', 'check-the-fix', 3, 'level', 'Check your fix', TRUE, NULL, 'Task: After the AI offers a fix, check that the problem is gone and nothing new broke.
Outline: Prompt: "How did you check? Say what you tried."
Evidence: a stated check, such as "I reloaded and the image appears."', '{"level":"adaptive-HoAI26-check-the-fix-15"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('a-list-and-a-random-pick-panels', 'a-list-and-a-random-pick', 1, 'panels', 'Options in a list', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-a-list-and-a-random-pick-16-985cb86f-2041-43cb-b46f-bc7e42276b04","imageUrl":"https://images.code.org/1cd0aa02fc4d84dac6ab68bc2cbd9d1d-panel-1-options-compact.gif","text":"###A list holds the options.\nAsk AI to store your lunch choices in a **list**, so your website can use them.","layout":"text-top-right"},{"key":"adaptive-HoAI26-a-list-and-a-random-pick-16-3be0c95d-6b6f-4966-a2b7-26df6e11886e","imageUrl":"https://images.code.org/5a3e5e587fd1a043fdb2a3676ea2bb22-panel-2-gentle-random-pick.gif","text":"####A random pick chooses one by chance.\nAsk AI to make the button randomly select one item from your list when clicked.","layout":"text-top-right"},{"key":"adaptive-HoAI26-a-list-and-a-random-pick-16-3c876579-7669-4811-8c2f-96dd4256a84e","imageUrl":"https://images.code.org/67316089bddc74a3a5ce74d24d2aa9f4-panel-3-spin-stop-pizza.gif","text":"####An animation shows the action.\nAsk AI to add a spinning animation that ends on the selected item. The random pick decides the result; the animation reveals it.","layout":"text-top-right"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('a-list-and-a-random-pick-widget', 'a-list-and-a-random-pick', 2, 'level', 'Edit the list, then pick', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-a-list-and-a-random-pick-17"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('a-list-and-a-random-pick-project', 'a-list-and-a-random-pick', 3, 'level', 'Describe your list and your pick', TRUE, NULL, 'Task: Tell the AI what the options are and how the page should pick one.
Outline: Prompt: "What are your options, and how should the page choose one?"
Evidence: explains that the page picks one item from a list by chance.', '{"level":"adaptive-HoAI26-a-list-and-a-random-pick-18"}', 'The student told the AI what the options are and that the page picks one of them from the list by chance.', 8);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('a-number-and-a-rule-video', 'a-number-and-a-rule', 1, 'panels', 'Numbers and rules', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-a-number-and-a-rule-19-ff36aee4-9b28-4837-a8bb-cb1fe23c8685","imageUrl":"https://images.code.org/650c60a6dc353e1479cc0c359507dae1-IA2-1-P1-jewel-game.gif","text":"### Keep track of the score.\nA **variable** stores the score. Collecting a jewel adds one point.","layout":"text-top-right"},{"key":"adaptive-HoAI26-a-number-and-a-rule-19-702877e1-c14a-4232-8ae3-cd5ae406db3d","imageUrl":"https://images.code.org/af5f22445a61179dbf99913438e141bb-IA2-1-P2-celebration.gif","text":"### Check a condition.\nA **condition** checks whether something is true, like “Has the score reached 10?”","layout":"text-top-right"},{"key":"adaptive-HoAI26-a-number-and-a-rule-19-6d6c39d0-b187-4102-a6c3-78ed9f9616c4","imageUrl":"https://images.code.org/227d9d3d6ac7204191b2a2936c4dca7c-IA2-1-P3-celebration.gif","text":"### Give the rule an action.\nIf the score reaches 10, end the round. Tell AI both the **condition** and what happens next.","layout":"text-top-left"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('a-number-and-a-rule-check', 'a-number-and-a-rule', 2, 'questions', 'Which one is the rule?', FALSE, NULL, NULL, '{"questions":[{"id":106,"type":"MultipleChoiceQuestion","questionName":"a-number-and-a-rule-q1","questionTitle":"A rule tells a program what to do when something happens. Which of these sentences describes a ''rule'' that dictates what happens on a web page?","choices":[{"id":"a","text":"The score is 7."},{"id":"b","text":"If the score reaches 10, the round ends."},{"id":"c","text":"The button is blue."},{"id":"d","text":"The page has a title."}],"correctChoiceId":"b"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('a-number-and-a-rule-respond', 'a-number-and-a-rule', 3, 'questions', 'Say your rule', FALSE, NULL, NULL, '{"questions":[{"id":107,"type":"freeResponse","text":"You just identified what a ''rule'' looks like. Now, think about your own page. What''s one thing you want to happen only if a certain condition is met? Write that rule using ''if... then...'' phrasing.","placeholder":"For example: If the button is clicked, then show a message."}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('a-number-and-a-rule-project', 'a-number-and-a-rule', 4, 'level', 'Add a number and a rule', TRUE, NULL, 'Task: Ask the AI for a number that changes (score, count or lives) and a rule that uses it.
Outline: Prompt: "What number will change, and what rule will use it?" The tutor shows the rule they wrote.
Evidence: names the number that changes and the rule that uses it.', '{"level":"adaptive-HoAI26-a-number-and-a-rule-22"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('remember-and-show-panels', 'remember-and-show', 1, 'panels', 'The page remembers', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-remember-and-show-23-60a73507-9342-4fa5-a250-17cda9d517ab","imageUrl":"https://images.code.org/4d29be579bd7aa3779ec4854ce0b062b-exec-e04a4234-d775-4a71-9678-ca814003e0d1.png","text":"### A page can remember a choice.\nAsk AI to **save** what a visitor picks, so your page can use it again.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-remember-and-show-23-f84d3cc7-053c-47be-b86b-2c325cea5a74","imageUrl":"https://images.code.org/4abe7bca4b75ec62370fb0394a006e51-save-choice-panel-2.png","text":"### A click can save a pick.\nA **call-to-action** tells visitors what to do next. This button saves their choice.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-remember-and-show-23-2e31310f-67f4-4985-97b5-cb4e3737bf88","imageUrl":"https://images.code.org/07e3b733eb26e18bbc9aaf70a34867ae-exec-ae6ea831-28d9-40df-9204-d5e475926311.png","text":"### Show the saved choice.\nAsk AI to display the saved pick as a **preview**, so visitors can see what they chose.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-remember-and-show-23-fd44436a-8421-46e6-86fc-09e5d92ff1a7","imageUrl":"https://images.code.org/c30d97607f314c58577127624e413f2a-exec-fe93bb00-9c6c-4174-b555-6bbeaa3aeefe.png","text":"### Make results easy to read.\nShow saved choices as **bars, counts, or previews**. Tell AI which display fits your page.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('remember-and-show-widget', 'remember-and-show', 2, 'level', 'What does the page remember?', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-remember-and-show-24"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('remember-and-show-project', 'remember-and-show', 3, 'level', 'Remember and show in your project', TRUE, NULL, 'Task: Tell the AI what the page should remember and what should show right away.
Outline: Prompt: "What should your page remember, and what should show when it does?"
Evidence: names what is remembered and what changes on screen.', '{"level":"adaptive-HoAI26-remember-and-show-25"}', 'The student told the AI what the page should remember and what should change on screen when it does.', 8);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('layout-and-spacing-panels', 'layout-and-spacing', 1, 'panels', 'Space, alignment and order', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-layout-and-spacing-26-b8561ce0-5788-4c6f-bb4d-15242c2f59cd","imageUrl":"https://images.code.org/ce2860098c51fd223e70317d971825ff-exec-fe26a9ce-3913-46f6-a827-825eaf85fe44.png","text":"### Crowded?\nWhen everything competes for attention, it’s hard to know where to look.","layout":"text-top-left"},{"key":"adaptive-HoAI26-layout-and-spacing-26-c5d19123-347f-4907-9eea-f01b4a70c5cb","imageUrl":"https://images.code.org/d4d89e11cad248d1f6b64c9ecc49af24-exec-bb553cd5-1d63-46cf-b593-25c9355f15bc.png","text":"### Give each part room.\nAsk AI to add **spacing** so each section is easier to scan.","layout":"text-top-left"},{"key":"adaptive-HoAI26-layout-and-spacing-26-cd11d90c-e2d0-4105-ab67-d3a54d1b88a4","imageUrl":"https://images.code.org/9802e2dccac9604194848285962c0cc2-exec-e9e426a5-7613-47f3-b7e2-ee6c9b094648.png","text":"### Guide the eye.\nPut the main idea first. Use **order** to lead visitors toward the next step.","layout":"text-top-left"},{"key":"adaptive-HoAI26-layout-and-spacing-26-6b38049a-14c4-4738-a592-7119c11ccfea","imageUrl":"https://images.code.org/06d52b077194cea6cf18de551ed109c8-exec-cd0ffc20-ba9e-4074-be21-5125bdf75ea3.png","text":"Order guides the eye.","layout":"text-top-left"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('layout-and-spacing-check', 'layout-and-spacing', 2, 'questions', 'Which description fixes it?', FALSE, NULL, NULL, '{"questions":[{"id":108,"type":"MultipleChoiceQuestion","questionName":"layout-and-spacing-q1","questionTitle":"Your club page has three cards that feel crowded. Which prompt is most likely to fix the problem?","choices":[{"id":"a","text":"Make the cards look more polished and modern overall."},{"id":"b","text":"Give each card a different color so they stand out more."},{"id":"c","text":"Add more space between the three cards."},{"id":"d","text":"Make the text on each card bigger so it is easier to read."}],"correctChoiceId":"c"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('layout-and-spacing-project', 'layout-and-spacing', 3, 'level', 'Describe a layout change', TRUE, NULL, 'Task: Ask the AI for a layout change that names the blocks and how they should be arranged.
Outline: Prompt: "Which blocks need more room or a different order? Say how they should be arranged."
Evidence: a prompt that names blocks and says how they should be arranged.', '{"level":"adaptive-HoAI26-layout-and-spacing-28"}', 'A prompt named the blocks that need more room or a different order and said how they should be arranged.', 8);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('style-and-consistency-video', 'style-and-consistency', 1, 'panels', 'Name a style, keep it', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-style-and-consistency-29-cc215da3-5e1a-4f98-913c-ec1eee2dd05c","imageUrl":"https://images.code.org/f3cb9bd3ec62ddf8131668d33ce5de26-One palette, one coherent style-1.png","text":"###You started with a clear style.\n\nRepeated colors, shapes, and spacing help your page feel planned.","layout":"text-top-right"},{"key":"adaptive-HoAI26-style-and-consistency-29-c917aa50-bf5c-4f46-a949-fef5c9b7a386","imageUrl":"https://images.code.org/77e8633bbeff7898b87371ff06dd2901-Angular hero clashes with rounded interface.png","text":"###Watch for style drift.\nA change can clash with the style you started with.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-style-and-consistency-29-99b13e14-681f-4d4d-a23a-cc040dc2a1d5","imageUrl":"https://images.code.org/afd9a4365032b86c688a34813e2e2295-When website styles drift apart-4.png","text":"###Small changes add up.\nDifferent buttons, colors, and shapes can make the page feel unplanned.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-style-and-consistency-29-b06446b7-09ac-4ffd-8f2d-9d7b1ea933d7","imageUrl":"https://images.code.org/7f6889237c06678894c13097d71032c4-Blue tones, rounded shapes, open space.png","text":"###Name your style.\nTell AI: “Use blue tones, rounded shapes, and generous spacing.”","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-style-and-consistency-29-4ef13276-0b29-49e6-8d98-7d15b4ea009a","imageUrl":"https://images.code.org/ce9531f139fad2a84160d5946006349e-Repeat the style, extend the page-5.png","text":"###Repeat it with each change.\nInclude your style in new prompts. Check that AI’s changes still match.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('style-and-consistency-respond', 'style-and-consistency', 2, 'questions', 'Your style in three words', FALSE, NULL, NULL, '{"questions":[{"id":109,"type":"freeResponse","text":"You just learned the importance of naming your site''s style to maintain consistency. Now, consider your own project!\n1. In three words, describe its overall visual style.\n\n    - *For example, you might choose words like ''calm, clean, rounded''.*\n\n2. Explain how you plan to implement the style across your page.","placeholder":"Enter three words to describe your site''s style."}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('style-and-consistency-project', 'style-and-consistency', 3, 'level', 'Keep your style across two changes', TRUE, NULL, 'Task: Make two more changes to their project and restate the style each time.
Outline: Prompt: "Make your next change and say your style again." The tutor checks a second change too.
Evidence: a follow-up that restates the style while changing one thing.', '{"level":"adaptive-HoAI26-style-and-consistency-31"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('readable-and-clear-panels', 'readable-and-clear', 1, 'panels', 'Size, contrast, wording', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-readable-and-clear-32-17cc1b70-462d-44ac-bdcb-93d7fd1edc7f","imageUrl":"https://images.code.org/04225fdad5705f600a6ec8311bfd7e43-exec-242a4c84-857f-4ca2-bb8c-d1d687cf72a6.png","text":"### Make it readable.\nAsk AI to increase the **text size** so visitors can read comfortably.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-readable-and-clear-32-ec23ee87-9cb3-488f-b4c8-20ac96287a44","imageUrl":"https://images.code.org/c5863c52866fb31b0d8c3cfab13edae8-exec-3ab911a1-e5f8-4fe7-ae9f-51c1510e1b0d.png","text":"### Help text stand out.\nUse strong **contrast** between text and its background.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-readable-and-clear-32-fe724db5-51e3-4045-95b1-5473f7cc8c7a","imageUrl":"https://images.code.org/550d5595a14bd71db0065557e9a005d3-exec-6adc946f-0d7f-42ac-8c4c-ec2a1a1fb7f1.png","text":"### Keep wording simple.\n“Sign up for a hike” is clearer than “Utilize the registration portal.”","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('readable-and-clear-widget', 'readable-and-clear', 2, 'level', 'Try the contrast', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-readable-and-clear-33"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('readable-and-clear-project', 'readable-and-clear', 3, 'level', 'Ask for a readability change', TRUE, NULL, 'Task: Pick a block that is hard to read and ask for a size, contrast or wording change.
Outline: Prompt: "Which block is hardest to read? Ask for a change."
Evidence: a prompt that names a block and a readability change.', '{"level":"adaptive-HoAI26-readable-and-clear-34"}', 'A prompt named a block that is hard to read and asked for a size, contrast or wording change to it.', 7);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('say-it-in-your-voice-panels', 'say-it-in-your-voice', 1, 'panels', 'Tone words', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-say-it-in-your-voice-35-ff3f6180-7ec7-4a00-b462-f87de8f4de4b","imageUrl":"https://images.code.org/9d519fe05a331ccf312c0bc868fe1af3-exec-7f697780-ab69-4513-a62b-e8a2ef6fc2be.png","text":"### Make it playful.\n“Your next favorite band is waiting.” Ask AI for a **playful tone**.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-say-it-in-your-voice-35-da7a2f94-c842-4315-b6ed-8d5b5ce14690","imageUrl":"https://images.code.org/c6aa5f33f5fcbf250ee2e0c3bbb9e8ed-exec-50aa666c-3932-4bd4-b866-2564db4d13cb.png","text":"### Keep it calm.\n“Take a break. Discover some live music.”\n\nAsk for a **calm tone**.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-say-it-in-your-voice-35-1d7cd456-4d4d-45e9-a2b9-3f1bf0333b42","imageUrl":"https://images.code.org/132c3b39c1971b7dda9a8e992128e43e-exec-a362a7c2-21fd-4180-8fa6-f03800b619de.png","text":"### Go bold.\n“Make some noise. Find your next show.”\n\nAsk for a **bold tone**.","layout":"text-top-right","typing":false,"fadeInOverPrevious":true},{"key":"adaptive-HoAI26-say-it-in-your-voice-35-b7ef8234-89ac-4314-8ceb-fe919d04fd89","imageUrl":"https://images.code.org/f440fded87fbf32dccd4bc6cd4512583-exec-50e909c0-eac4-4147-8a74-4e362ff3178a.png","text":"### Keep the voice consistent.\nName your **tone**, then check that AI carries it through the page.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('say-it-in-your-voice-respond', 'say-it-in-your-voice', 2, 'questions', 'Your site''s tone in three words', FALSE, NULL, NULL, '{"questions":[{"id":110,"type":"freeResponse","text":"You just learned how important tone words are for keeping your site consistent. Now, think about your own project:\n\n**In three words, how should your site sound to visitors?**\n\n*For example, you might choose words like ''friendly, calm, or funny''.*","placeholder":"Enter your three tone words..."}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('say-it-in-your-voice-project', 'say-it-in-your-voice', 3, 'level', 'Keep your tone across two changes', TRUE, NULL, 'Task: Make two more changes and restate the tone each time.
Outline: Prompt: "Make your next change and say your tone again."
Evidence: a follow-up that restates the tone while changing one thing.', '{"level":"adaptive-HoAI26-say-it-in-your-voice-37"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('lead-with-the-point-video', 'lead-with-the-point', 1, 'panels', 'Say it in the first line', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-lead-with-the-point-38-55f0cf0b-0ccb-46b4-ac54-245ba803ce69","imageUrl":"https://images.code.org/da95e048441c04667aab87737753b2b7-Polished website, unclear purpose-1.png","text":"###What’s this site for?\n\n“Something amazing starts here” sounds exciting, but says little.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-lead-with-the-point-38-83e1d8d1-deb3-4653-8558-045145f45dac","imageUrl":"https://images.code.org/e21cdf05328aa67bc51c7de962a83e4f-Bike repair hero makes purpose clear-2.png","text":"###Say it up front.\n\nTry “Fix your bike at our student-run repair café.”\n\nMake the headline specific.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-lead-with-the-point-38-a770442b-cdd6-4ceb-8511-4c7c42c5cfec","imageUrl":"https://images.code.org/2439225e50f50a0ecb8342f0e04bae94-Lead with the point-3.png","text":"###Then show the next step.\nAdd key details below the hero.\n\nFollow them with a clear call-to-action.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('lead-with-the-point-check', 'lead-with-the-point', 2, 'questions', 'Which headline leads?', FALSE, NULL, NULL, '{"questions":[{"id":111,"type":"MultipleChoiceQuestion","questionName":"lead-with-the-point-q1","questionTitle":"Which headline best communicates what a website is about to a new student?","choices":[{"id":"a","text":"Welcome!"},{"id":"b","text":"Find a club that fits you in two minutes."},{"id":"c","text":"Our school, our story."},{"id":"d","text":"Click here."}],"correctChoiceId":"b"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('lead-with-the-point-project', 'lead-with-the-point', 3, 'level', 'Rewrite your headline', TRUE, NULL, 'Task: Ask the AI to change the headline and first line, or edit them by hand.
Outline: Prompt: "What is your site for? Make the headline say it."
Evidence: a prompt or edit that states the site''s purpose in the headline.', '{"level":"adaptive-HoAI26-lead-with-the-point-40"}', 'The headline now says what the site is for, whether a prompt asked for it or the student edited it by hand.', 8);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('make-the-ask-clear-panels', 'make-the-ask-clear', 1, 'panels', 'A button that says what to do', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-make-the-ask-clear-41-dcc4456d-fb5e-4458-8425-822f4ae00b38","imageUrl":"https://images.code.org/9ae72478984d51a1a4f7f50585de7321-exec-72fc7316-b4bd-4972-947e-3baee0863e80.png","text":"### What happens next?\n“Click here” gives few clues.\n\nA **call-to-action** should name the next step.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-make-the-ask-clear-41-be68f628-41fd-4b16-9687-cbdc2f0b844b","imageUrl":"https://images.code.org/9e90e3037f40a4e2a152bd6f99535875-exec-b49c01e4-6ac8-468f-baa6-f684f8c7533d.png","text":"### Name the action.\n“Find my club” tells visitors what to do and what to expect.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-make-the-ask-clear-41-90457403-06f2-42a5-b0b5-744d20b9b404","imageUrl":"https://images.code.org/ae9b640fd4cc994969d70553fed68526-exec-677f668b-e17b-4764-ab0c-a4a82fc95742.png","text":"### Put it where it helps.\nPlace the **call-to-action** where visitors are ready to act.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-make-the-ask-clear-41-5e12a9f4-ad4e-4b30-a0b9-3b4bba4fa2d5","imageUrl":"https://images.code.org/79ea2907e35cf7577f270b5924178411-exec-83be5833-e361-4cc5-b12b-34eac81465f0.png","text":"### Try it on your site.\nChoose what visitors should do next.\n\nAsk AI to add a **call-to-action** that clearly names that action.","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('make-the-ask-clear-widget', 'make-the-ask-clear', 2, 'level', 'Fix the button', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-make-the-ask-clear-42"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('make-the-ask-clear-project', 'make-the-ask-clear', 3, 'level', 'Rewrite your call-to-action', TRUE, NULL, 'Task: Ask for a call-to-action with a clear verb and next step, or edit it by hand.
Outline: Prompt: "What should a visitor do next? Make the button say it."
Evidence: a call-to-action with a clear verb and next step.', '{"level":"adaptive-HoAI26-make-the-ask-clear-43"}', 'The call-to-action now has a clear verb and a next step, whether a prompt asked for it or the student edited it by hand.', 8);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('read-the-console-video', 'read-the-console', 1, 'panels', 'What the console shows', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-read-the-console-44-9f5dbebe-f7db-4099-88dc-e4c8077c964a","imageUrl":"https://images.code.org/7406ca7b52762f9ae0cc0dffcff022ca-Skate park page with open console-1.png","text":"### Meet the console.\nThe **console** shows messages from your page as it runs. Open it to look for clues.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-read-the-console-44-1a366fb1-0ee1-46b7-a440-c95f22f0bec3","imageUrl":"https://images.code.org/8ad3a3afa3376441e8c67a331f80033d-Console roles_ output, warnings, and errors-2.png","text":"### Messages mean different things.\nSome show information. **Warnings** flag possible issues, and **errors** report something that went wrong.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-read-the-console-44-b0471c8c-a563-4395-a761-b77888ad3865","imageUrl":"https://images.code.org/540b0ca8e3f1ec2c7b0ef039a5cbf397-UH1-1-panel-3-console-clue.gif","text":"### An error is a clue.\nRead the message for details about the problem. Ask AI to explain it and suggest what to check.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('read-the-console-panels', 'read-the-console', 2, 'panels', 'Where, what, which line', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-read-the-console-45-40dec2e0-919d-41f0-a8ad-ba0f479e77fb","imageUrl":"https://images.code.org/d91abc4ebde4eab44b33beee5ee2fd80-exec-35f2bb74-c87c-4b3e-a294-c94e36a5449d.png","text":"### Start with the message.\nAn **error message** gives you a clue about what went wrong.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-read-the-console-45-d66b94d7-28e1-47fa-804f-f8cb85170c92","imageUrl":"https://images.code.org/0fc0066745cda9e97b6e16cddfb4f317-exec-9b38705e-9705-4660-8762-55654f0dd639.png","text":"### What does it name?\nLook for a named item.\n\nShare the **exact message** with AI.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-read-the-console-45-98f9f320-d2f7-4e94-9d56-45d0f77eaf7c","imageUrl":"https://images.code.org/ad1bc15d41554ed3a28b134f108217fc-exec-ded66e0c-911f-4d5b-9955-ec01b1c80c53.png","text":"### Follow the line.\nCheck the **file and line number**.\n\nThe cause may be there or earlier in the code.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('read-the-console-project', 'read-the-console', 3, 'level', 'Read your console', TRUE, NULL, 'Task: Open the console in their project and say what an error points to.
Outline: Needs a real error. Prompt: "Open the console. What does the error point to?"
Evidence: says which keyword or line the error points to.', '{"level":"adaptive-HoAI26-read-the-console-46"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('find-it-in-the-code-panels', 'find-it-in-the-code', 1, 'panels', 'Blocks have names', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-find-it-in-the-code-47-e0d52bb0-ebf1-473b-9b2f-b13ead044145","imageUrl":"https://images.code.org/483bf09538a2b1f40646e3c779420310-exec-dd3ad5dc-b1e3-4e70-b19e-817af1c2e9a1.png","text":"### Start with the page.\nPick a section to explore, like the **hero** at the top.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-find-it-in-the-code-47-e7d42de2-ef20-4863-9d17-fa9324c15094","imageUrl":"https://images.code.org/5e731094294495b62187bb921df4fc85-exec-cde11f67-18b0-4b1c-8710-7226f5364301.png","text":"### Find a matching clue.\nLook for familiar text or an **identifier**, such as an ID or class.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-find-it-in-the-code-47-583b40f0-e348-44c0-b4fc-74d5af7279e4","imageUrl":"https://images.code.org/dd0e3b26d5901ca78afc89985f7e8f3c-exec-f373bd64-be7e-49d3-9df5-e283562d5965.png","text":"### Search for it.\nSearch for that identifier to find code that builds or styles the section.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('find-it-in-the-code-widget', 'find-it-in-the-code', 2, 'level', 'Search the code', FALSE, NULL, NULL, '{"level":"adaptive-HoAI26-find-it-in-the-code-48"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('find-it-in-the-code-project', 'find-it-in-the-code', 3, 'level', 'Find a line in your project', TRUE, NULL, 'Task: Find the line for one named block in their code.
Outline: Prompt: "Pick a block and find its line in your code."
Evidence: points to the line or rule for a named block.', '{"level":"adaptive-HoAI26-find-it-in-the-code-49"}', 'The student pointed to the line or rule in the code for a block they named.', 8);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('undo-to-find-the-cause-video', 'undo-to-find-the-cause', 1, 'panels', 'Undo one at a time', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-undo-to-find-the-cause-50-37af3dfc-0d7b-4abb-8b5d-517f315f0d0a","imageUrl":"https://images.code.org/c120af95ff7f838540025a3528e8305b-exec-f65ed012-ed38-4e6e-b097-6ba28c7c4940.png","text":"### Something broke.\nAfter a change, test your page.\n\nHere, the banner covers part of the button.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-undo-to-find-the-cause-50-e68638d4-944c-44c1-899b-7bfb599853f5","imageUrl":"https://images.code.org/8caa8a03da4b57974d9a869fdc4d81f9-UH3-1-undo-to-find-the-cause.gif","text":"### Undo gives you clues.\n**Undo one change at a time**, then test again.\n\nWhen the problem disappears, the change you reversed is a clue.","layout":"text-top-right","fadeInOverPrevious":true},{"key":"adaptive-HoAI26-undo-to-find-the-cause-50-1ea4fc18-b29a-41b9-921d-5d578aac815b","imageUrl":"https://images.code.org/1a67ceeb5dce237f0d8e9e06dc64eb19-exec-333cd2b2-b949-4239-892b-4c4b10489b78.png","text":"### Give AI the clue.\n**Tell AI:** “Making the banner taller covered the button. Keep the button visible.”\n\n**Test again** after AI makes the change.","layout":"text-top-right","fadeInOverPrevious":true}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('undo-to-find-the-cause-check', 'undo-to-find-the-cause', 2, 'questions', 'What do you undo first?', FALSE, NULL, NULL, '{"questions":[{"id":112,"type":"MultipleChoiceQuestion","questionName":"undo-to-find-the-cause-q1","questionTitle":"You made three changes to your project, and now something isn''t working. What''s the best first step to find which change caused the problem?","choices":[{"id":"a","text":"Undo all three changes at once."},{"id":"b","text":"Undo the newest change, then check if it''s fixed."},{"id":"c","text":"Undo the oldest change first."},{"id":"d","text":"Do nothing and ask the AI for a new page."}],"correctChoiceId":"b"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('undo-to-find-the-cause-respond', 'undo-to-find-the-cause', 3, 'questions', 'Guess the cause', FALSE, NULL, NULL, '{"questions":[{"id":113,"type":"freeResponse","text":"You just learned that undoing changes one by one helps pinpoint problems. Now, imagine your project has a new bug after several recent changes. Which specific change do you *guess* might have caused the problem, and why?","placeholder":"I think [this change] broke it because [reason]..."}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('undo-to-find-the-cause-project', 'undo-to-find-the-cause', 4, 'level', 'Find the cause in your project', TRUE, NULL, 'Task: Undo one change at a time, check after each, and find which one caused the problem.
Outline: Needs a real problem after more than one change. Prompt: "Undo your newest change. Did it fix it?" Repeat until it works.
Evidence: names the change that caused the problem and how they found it.', '{"level":"adaptive-HoAI26-undo-to-find-the-cause-53"}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('show-it-off-widget-1', 'show-it-off', 1, 'panels', 'Your hour, replayed', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-show-it-off-54-cf6f9859-cfe3-4437-a266-0bfc2466d90d","imageUrl":"https://images.code.org/0d1e1113611b51a03ceb029b3445ae38-adaptive-HoAI26-show-it-off-54-panel-1-4ae0e271-2bfb-4feb-bef7-c059a00abc2a.png","text":"Remember all the changes you''ve made? Let''s take a look back at your project''s journey.","layout":"text-top-left"},{"key":"adaptive-HoAI26-show-it-off-54-1c7be411-eeb7-41d7-9477-03003dc86958","imageUrl":"https://images.code.org/693314a641f65910d974856a033aed23-adaptive-HoAI26-show-it-off-54-panel-2-3289cac7-7162-4d50-ab9c-82269d515ce2.png","text":"You can use a slider to replay how your web page changed over time, from your first prompt to your latest edits.","layout":"text-top-left"},{"key":"adaptive-HoAI26-show-it-off-54-904fb4bc-e463-43b0-b8fe-bff1afc5b286","imageUrl":"https://images.code.org/09450807f161421c79582ba4ac024f61-adaptive-HoAI26-show-it-off-54-panel-3-ac4b49f9-0044-452f-b686-d7d8e44a1d64.png","text":"Along the way, you earned special badges for mastering new web development skills!","layout":"text-top-left"},{"key":"adaptive-HoAI26-show-it-off-54-da5a5c90-fbb9-429e-b995-0baf560fb9f0","imageUrl":"https://images.code.org/6a2ddfb0f81617574cde86c432bf54b9-adaptive-HoAI26-show-it-off-54-panel-4-a219fc85-4267-4ae7-8e68-e103f1a416e1.png","text":"Like the ''Page Namer'' badge, for when you first identified a page part by its proper name.","layout":"text-top-left"},{"key":"adaptive-HoAI26-show-it-off-54-33ce18c0-f3ba-46c0-92d7-fc5a6c835ad5","imageUrl":"https://images.code.org/493cdc53995bfa4df6a94438b3ebc50b-adaptive-HoAI26-show-it-off-54-panel-5-e6e5d35a-b9a3-41b7-8e41-2e73846216dc.png","text":"Or the ''Fix Checker'' badge, when you successfully confirmed a bug fix!","layout":"text-top-left"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('show-it-off-widget-2', 'show-it-off', 2, 'panels', 'Your skill summary', FALSE, NULL, NULL, '{"panels":[{"key":"adaptive-HoAI26-show-it-off-55-2f5f9564-b31d-42c8-baff-a62bd13446c0","imageUrl":"https://images.code.org/d422654ff1c8ff7adf72682e38d9ad07-adaptive-HoAI26-show-it-off-55-panel-1-351f6d3b-94a8-4f3f-a475-cba15683808e.png","text":"Your hard work has paid off! Let''s review your journey and celebrate your new skills.","layout":"text-top-center"},{"key":"adaptive-HoAI26-show-it-off-55-f83d3def-9ddf-4139-9c42-08552a3b8563","imageUrl":"https://images.code.org/eb6a7baf0681fe80946d7d7c827f23b0-adaptive-HoAI26-show-it-off-55-panel-2-93f0a690-2d55-46cc-a4ec-92ef1bccb3bb.png","text":"See how your prompts grew more detailed and how many tries it took to get your perfect page.","layout":"text-bottom-center"},{"key":"adaptive-HoAI26-show-it-off-55-6dd9fe87-d7ce-4d9f-ba9a-8956b02ae277","imageUrl":"https://images.code.org/25d3fb2147a18ccc3e492384c79e55e9-adaptive-HoAI26-show-it-off-55-panel-3-d5aaee9e-8d47-4b52-8933-79699e392251.png","text":"Replay your closeness ratings, showing how well AI results matched your vision every time.","layout":"text-top-center"},{"key":"adaptive-HoAI26-show-it-off-55-c086b13d-593e-4f31-bee9-4e9c5404e3f2","imageUrl":"https://images.code.org/d9cf8e2f3119aa7d3d79c291dc6e170a-adaptive-HoAI26-show-it-off-55-panel-4-56b5dd61-8794-4256-8a38-dcf0dd5c4e7c.png","text":"Special badges will light up, recognizing the key moves you''ve mastered.","layout":"text-bottom-center"}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('show-it-off-respond', 'show-it-off', 3, 'questions', 'Tell people about it', FALSE, NULL, NULL, '{"questions":[{"id":114,"type":"freeResponse","text":"You''ve worked hard on your project! Now, write a short description for a share card that explains what your site is, who you made it for, and what part you''re proudest of.","placeholder":"Describe your site, its audience, and what you''re proudest of..."}]}', NULL, NULL);
INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES ('show-it-off-project', 'show-it-off', 4, 'level', 'Show it off', TRUE, NULL, 'Task: Publish the site and copy its link, then share it with the class.
Outline: Project only. The student publishes the site and copies the link, then shares it with the class: present it, post it, or both. The teacher chooses how. The share card from the last step goes with it.
No evidence needed. The teacher view records that it was shared.', '{"level":"adaptive-HoAI26-show-it-off-57"}', NULL, NULL);
-- MEASURE: 3 rows
INSERT INTO MEASURE (MeasureId, StepId, SkillId, QuestionName, EvidenceMap) VALUES (1, 'intro-web-dev', 7, 'intro-knowledge-button', '{"a":1,"b":2,"c":0,"d":1,"e":0}');
INSERT INTO MEASURE (MeasureId, StepId, SkillId, QuestionName, EvidenceMap) VALUES (2, 'intro-web-dev', 8, 'intro-knowledge-cards', '{"a":1,"b":1,"c":2,"d":2,"e":0}');
INSERT INTO MEASURE (MeasureId, StepId, SkillId, QuestionName, EvidenceMap) VALUES (3, 'intro-web-dev', 9, 'intro-knowledge-error', '{"a":0,"b":1,"c":1,"d":2,"e":0}');
-- (62 steps)
-- STUDENT_PROFILE: 2 rows
INSERT INTO STUDENT_PROFILE (StudentId, Name) VALUES (1, 'test-student-1');
INSERT INTO STUDENT_PROFILE (StudentId, Name) VALUES (2, 'test-student-2');

-- STUDENT_ENROLLED_COURSES: 2 rows
INSERT INTO STUDENT_ENROLLED_COURSES (StudentId, CourseId) VALUES (1, 1);
INSERT INTO STUDENT_ENROLLED_COURSES (StudentId, CourseId) VALUES (2, 1);

-- STUDENT: 3 rows
INSERT INTO STUDENT (StudentId, SkillId, CompetenceLevel, McqScore, CreatedAt, UpdatedAt) VALUES (1, 1, 3, 90, '2026-11-03 09:05:00', '2026-11-03 09:12:00');
INSERT INTO STUDENT (StudentId, SkillId, CompetenceLevel, McqScore, CreatedAt, UpdatedAt) VALUES (1, 2, 2, 60, '2026-11-03 09:13:00', '2026-11-03 09:20:00');
INSERT INTO STUDENT (StudentId, SkillId, CompetenceLevel, McqScore, CreatedAt, UpdatedAt) VALUES (1, 4, 1, 40, '2026-11-03 09:28:00', '2026-11-03 09:30:00');

-- ---------------------------------------------------------------------------
-- Sample transactional state. Authored for the hackathon: synthetic students,
-- not real data. Student 1 is a quick learner, student 2 a slow learner.
-- ---------------------------------------------------------------------------
-- TEACHER, TEACHER_CONFIG
INSERT INTO TEACHER (TeacherId, Name) VALUES (1, 'test-teacher-1');
INSERT INTO TEACHER_CONFIG (TeacherId, AnswerTimeoutSeconds) VALUES (1, 180);
-- STUDENT_ENROLLED_COURSES (course 2)
INSERT INTO STUDENT_ENROLLED_COURSES (StudentId, CourseId) VALUES (1, 2);
INSERT INTO STUDENT_ENROLLED_COURSES (StudentId, CourseId) VALUES (2, 2);
-- STUDENT_SKILL_EVIDENCE
INSERT INTO STUDENT_SKILL_EVIDENCE (EvidenceId, StudentId, SkillId, Level, SourceStepId, CreatedAt) VALUES (1, 1, 7, 2, 'intro-web-dev', '2026-11-04 09:10:00');
INSERT INTO STUDENT_SKILL_EVIDENCE (EvidenceId, StudentId, SkillId, Level, SourceStepId, CreatedAt) VALUES (2, 1, 8, 2, 'intro-web-dev', '2026-11-04 09:10:00');
INSERT INTO STUDENT_SKILL_EVIDENCE (EvidenceId, StudentId, SkillId, Level, SourceStepId, CreatedAt) VALUES (3, 2, 7, 0, 'steer-it-project', '2026-11-04 09:20:00');
INSERT INTO STUDENT_SKILL_EVIDENCE (EvidenceId, StudentId, SkillId, Level, SourceStepId, CreatedAt) VALUES (4, 2, 7, 0, 'steer-it-project', '2026-11-04 09:26:00');
-- STEP_ATTEMPT
INSERT INTO STEP_ATTEMPT (AttemptId, StudentId, StepId, InputText, ProjectSnapshotRef, EvidenceLevel, Confidence, PromptVersion, CreatedAt) VALUES ('sample-attempt-1', 1, 'intro-plan', 'A site about my school robotics club, for new students who want to join.', NULL, NULL, NULL, NULL, '2026-11-04 09:05:00');
INSERT INTO STEP_ATTEMPT (AttemptId, StudentId, StepId, InputText, ProjectSnapshotRef, EvidenceLevel, Confidence, PromptVersion, CreatedAt) VALUES ('sample-attempt-2', 2, 'steer-it-project', 'make it better', 'snapshots/student-2/attempt-2', 0, 0.9, 'validator-v1', '2026-11-04 09:20:00');
INSERT INTO STEP_ATTEMPT (AttemptId, StudentId, StepId, InputText, ProjectSnapshotRef, EvidenceLevel, Confidence, PromptVersion, CreatedAt) VALUES ('sample-attempt-3', 2, 'steer-it-project', 'make it look nicer', 'snapshots/student-2/attempt-3', 0, 0.85, 'validator-v1', '2026-11-04 09:26:00');
-- CHECKPOINT_PROGRESS
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (1, 'intro', 'completed', '2026-11-04 09:10:00');
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (1, 'steer-it', 'tested_out', '2026-11-04 09:10:00');
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (1, 'use-the-lingo', 'tested_out', '2026-11-04 09:10:00');
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (1, 'keep-or-redirect', 'current', '2026-11-04 09:10:00');
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (1, 'give-context', 'available', '2026-11-04 09:10:00');
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (2, 'intro', 'completed', '2026-11-04 09:12:00');
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (2, 'steer-it', 'current', '2026-11-04 09:12:00');
INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) VALUES (2, 'use-the-lingo', 'available', '2026-11-04 09:12:00');
-- REMEDIATION_FLAG
INSERT INTO REMEDIATION_FLAG (FlagId, StudentId, SkillId, Reason, Severity, CreatedAt, ResolvedAt) VALUES (1, 2, 7, 'Two consecutive misses on Build with AI', 'normal', '2026-11-04 09:26:00', NULL);
-- ROUTING_DECISION
INSERT INTO ROUTING_DECISION (DecisionId, StudentId, TeacherId, ProposedCheckpointId, TeacherInput, AppliedCheckpointId, Reason, CreatedAt) VALUES ('sample-decision-1', 1, NULL, 'keep-or-redirect', 'auto', 'keep-or-redirect', 'Build and Language evidence met the targets for steer-it and use-the-lingo, so both were tested out. keep-or-redirect has the largest remaining gap.', '2026-11-04 09:10:00');
INSERT INTO ROUTING_DECISION (DecisionId, StudentId, TeacherId, ProposedCheckpointId, TeacherInput, AppliedCheckpointId, Reason, CreatedAt) VALUES ('sample-decision-2', 2, 1, 'use-the-lingo', 'hold', 'steer-it', 'Teacher held the student on steer-it. Auto routing would have proposed use-the-lingo.', '2026-11-04 09:27:00');
-- FALLBACK_EVENT
INSERT INTO FALLBACK_EVENT (FallbackEventId, StudentId, StepId, Component, Error, CreatedAt) VALUES (1, 2, 'steer-it-project', 'validation', 'Validator confidence 0.52 is below 0.6', '2026-11-04 09:21:00');
-- PASSIVE_SIGNAL
INSERT INTO PASSIVE_SIGNAL (SignalId, StudentId, Signal, HintStyle, AngleToTry, Reason, EvidenceRefs, Confidence, FeaturesHash, ModelId, PromptVersion, CreatedAt) VALUES ('sample-signal-1', 1, 'speed_up', 'guiding_question', NULL, 'Evidence met the targets on the first tries with no hints.', '["sample-attempt-1"]', 0.9, 'sample-hash-1', NULL, 'rules-v1', '2026-11-04 09:10:00');
INSERT INTO PASSIVE_SIGNAL (SignalId, StudentId, Signal, HintStyle, AngleToTry, Reason, EvidenceRefs, Confidence, FeaturesHash, ModelId, PromptVersion, CreatedAt) VALUES ('sample-signal-2', 2, 'slow_down', 'example', 'analogy', 'Two prompts in a row had no specific details. An example comes before an analogy.', '["sample-attempt-2","sample-attempt-3"]', 0.8, 'sample-hash-2', NULL, 'rules-v1', '2026-11-04 09:26:00');
-- HINT_EVENT
INSERT INTO HINT_EVENT (HintEventId, StudentId, StepId, HintStyle, Angle, CreatedAt) VALUES (1, 2, 'steer-it-project', 'guiding_question', 'specific details', '2026-11-04 09:22:00');
INSERT INTO HINT_EVENT (HintEventId, StudentId, StepId, HintStyle, Angle, CreatedAt) VALUES (2, 2, 'steer-it-project', 'example', 'before and after prompt', '2026-11-04 09:27:00');
-- Advance the identity sequences past the ids inserted above.
SELECT setval(pg_get_serial_sequence('course', 'courseid'), (SELECT max(courseid) FROM course));
SELECT setval(pg_get_serial_sequence('skills', 'skillid'), (SELECT max(skillid) FROM skills));
SELECT setval(pg_get_serial_sequence('mcq_questions', 'questionid'), (SELECT max(questionid) FROM mcq_questions));
SELECT setval(pg_get_serial_sequence('learning_examples', 'exampleid'), (SELECT max(exampleid) FROM learning_examples));
SELECT setval(pg_get_serial_sequence('skill_tier_content', 'tiercontentid'), (SELECT max(tiercontentid) FROM skill_tier_content));
SELECT setval(pg_get_serial_sequence('skill_rubric_criteria', 'criterionid'), (SELECT max(criterionid) FROM skill_rubric_criteria));
SELECT setval(pg_get_serial_sequence('measure', 'measureid'), (SELECT max(measureid) FROM measure));
SELECT setval(pg_get_serial_sequence('student_profile', 'studentid'), (SELECT max(studentid) FROM student_profile));
SELECT setval(pg_get_serial_sequence('teacher', 'teacherid'), (SELECT max(teacherid) FROM teacher));
SELECT setval(pg_get_serial_sequence('student_skill_evidence', 'evidenceid'), (SELECT max(evidenceid) FROM student_skill_evidence));
SELECT setval(pg_get_serial_sequence('remediation_flag', 'flagid'), (SELECT max(flagid) FROM remediation_flag));
SELECT setval(pg_get_serial_sequence('fallback_event', 'fallbackeventid'), (SELECT max(fallbackeventid) FROM fallback_event));
SELECT setval(pg_get_serial_sequence('hint_event', 'hinteventid'), (SELECT max(hinteventid) FROM hint_event));
COMMIT;
