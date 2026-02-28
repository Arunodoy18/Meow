/**
 * Meow AI - Site-Specific Extractors v1.0
 * Targeted content extraction for supported sites.
 * Falls back to generic extraction if specific extractor fails.
 */

const MeowSiteExtractors = (() => {
  'use strict';

  const MAX_EXTRACT_LENGTH = 12000; // increased from 8000 for rich extractions

  // ==================== GITHUB PR EXTRACTOR ====================

  function _extractGitHubPR() {
    try {
      const data = { type: 'github_pr' };

      // PR title
      const titleEl = document.querySelector('.js-issue-title, .gh-header-title .markdown-title');
      data.title = titleEl?.textContent?.trim() || document.title;

      // PR description / body
      const bodyEl = document.querySelector('.comment-body.markdown-body');
      data.description = bodyEl?.innerText?.trim()?.substring(0, 2000) || '';

      // Changed files list
      const fileHeaders = document.querySelectorAll('.file-header .file-info a, .file-header [title]');
      data.changedFiles = Array.from(fileHeaders).slice(0, 30).map(el => el.textContent.trim()).filter(Boolean);

      // Diff content (most important)
      const diffBlocks = document.querySelectorAll('.blob-code-inner');
      const diffs = [];
      let diffLen = 0;
      for (const block of diffBlocks) {
        if (diffLen > 4000) break;
        const line = block.textContent.trim();
        if (line) {
          const parent = block.closest('.blob-code-addition, .blob-code-deletion, .blob-code-context');
          const prefix = parent?.classList.contains('blob-code-addition') ? '+' :
                        parent?.classList.contains('blob-code-deletion') ? '-' : ' ';
          diffs.push(prefix + line);
          diffLen += line.length;
        }
      }
      data.diff = diffs.join('\n');

      // Review comments
      const reviewComments = document.querySelectorAll('.review-comment .comment-body');
      data.reviewComments = Array.from(reviewComments).slice(0, 10).map(el => el.innerText.trim().substring(0, 300));

      // PR metadata
      const labels = document.querySelectorAll('.js-issue-labels .IssueLabel, .sidebar-labels .IssueLabel');
      data.labels = Array.from(labels).map(el => el.textContent.trim());

      const statusEl = document.querySelector('.State');
      data.status = statusEl?.textContent?.trim() || '';

      return _formatExtraction(data, `PR: ${data.title}\nStatus: ${data.status}\nLabels: ${data.labels.join(', ')}\n\nDescription:\n${data.description}\n\nChanged Files (${data.changedFiles.length}):\n${data.changedFiles.join('\n')}\n\nDiff:\n${data.diff}\n\nReview Comments:\n${data.reviewComments.join('\n---\n')}`);
    } catch (e) {
      console.warn('🐱 GitHub PR extractor failed:', e);
      return null;
    }
  }

  // ==================== GITHUB REPO EXTRACTOR ====================

  function _extractGitHubRepo() {
    try {
      const data = { type: 'github_repo' };

      // Repo name
      data.name = document.querySelector('[itemprop="name"] a, .AppHeader-context-item-label')?.textContent?.trim() || '';

      // Description
      data.description = document.querySelector('.f4.my-3, [itemprop="about"], .repo-description p')?.textContent?.trim() || '';

      // README content
      const readme = document.querySelector('#readme .markdown-body, article.markdown-body');
      data.readme = readme?.innerText?.trim()?.substring(0, 5000) || '';

      // Topics
      const topics = document.querySelectorAll('.topic-tag');
      data.topics = Array.from(topics).map(el => el.textContent.trim());

      // Stats
      const stars = document.querySelector('#repo-stars-counter-star, [id*="star-count"]');
      data.stars = stars?.textContent?.trim() || '';

      // File tree
      const files = document.querySelectorAll('.js-navigation-item .js-navigation-open, [data-testid="listRow-name-text"]');
      data.files = Array.from(files).slice(0, 50).map(el => el.textContent.trim());

      // Languages
      const langs = document.querySelectorAll('.BorderGrid-cell .Progress + ul li .text-bold');
      data.languages = Array.from(langs).map(el => el.textContent.trim());

      return _formatExtraction(data, `Repository: ${data.name}\nDescription: ${data.description}\nTopics: ${data.topics.join(', ')}\nStars: ${data.stars}\nLanguages: ${data.languages.join(', ')}\n\nFiles:\n${data.files.join('\n')}\n\nREADME:\n${data.readme}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== LEETCODE EXTRACTOR ====================

  function _extractLeetCode() {
    try {
      const data = { type: 'leetcode' };

      // Problem title & number
      const titleEl = document.querySelector('[data-cy="question-title"], .text-title-large, h4[class*="title"]');
      data.title = titleEl?.textContent?.trim() || document.title;

      // Difficulty
      const diffEl = document.querySelector('[diff], .text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard, [class*="difficulty"]');
      data.difficulty = diffEl?.textContent?.trim() || '';

      // Problem description
      const descEl = document.querySelector('[data-track-load="description_content"], .elfjS, [class*="description"]');
      data.description = descEl?.innerText?.trim()?.substring(0, 3000) || '';

      // Examples
      const examples = document.querySelectorAll('pre');
      data.examples = Array.from(examples).slice(0, 4).map(el => el.textContent.trim());

      // Constraints
      const constraintHeader = Array.from(document.querySelectorAll('p, strong')).find(el => el.textContent.includes('Constraints'));
      if (constraintHeader) {
        const list = constraintHeader.closest('p')?.nextElementSibling;
        data.constraints = list?.innerText?.trim() || '';
      }

      // User's code (if any in editor)
      const codeEditor = document.querySelector('.monaco-editor .view-lines, .CodeMirror-code, [class*="editor"] .view-lines');
      data.userCode = codeEditor?.innerText?.trim()?.substring(0, 2000) || '';

      // Topics/tags
      const tags = document.querySelectorAll('[class*="topic-tag"], [class*="tag"]');
      data.tags = Array.from(tags).slice(0, 10).map(el => el.textContent.trim()).filter(t => t.length > 1 && t.length < 30);

      return _formatExtraction(data, `LeetCode Problem: ${data.title}\nDifficulty: ${data.difficulty}\nTags: ${data.tags.join(', ')}\n\nDescription:\n${data.description}\n\nExamples:\n${data.examples.join('\n\n')}\n\nConstraints:\n${data.constraints || 'Not found'}\n\nUser Code:\n${data.userCode || 'No code yet'}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== STACK OVERFLOW EXTRACTOR ====================

  function _extractStackOverflow() {
    try {
      const data = { type: 'stackoverflow' };

      // Question title
      data.title = document.querySelector('#question-header h1, .question-hyperlink')?.textContent?.trim() || document.title;

      // Question body
      const questionBody = document.querySelector('#question .js-post-body, .question .s-prose');
      data.question = questionBody?.innerText?.trim()?.substring(0, 2000) || '';

      // Question votes
      const votes = document.querySelector('#question .js-vote-count, .question [itemprop="upvoteCount"]');
      data.questionVotes = votes?.textContent?.trim() || '0';

      // Tags
      const tags = document.querySelectorAll('.post-tag, .s-tag');
      data.tags = Array.from(new Set(Array.from(tags).map(el => el.textContent.trim()))).slice(0, 10);

      // Answers
      const answers = document.querySelectorAll('.answer');
      data.answers = Array.from(answers).slice(0, 5).map(ans => {
        const body = ans.querySelector('.js-post-body, .s-prose');
        const ansVotes = ans.querySelector('.js-vote-count');
        const isAccepted = ans.classList.contains('accepted-answer') || ans.querySelector('.js-accepted-answer-indicator');
        return {
          body: body?.innerText?.trim()?.substring(0, 1500) || '',
          votes: ansVotes?.textContent?.trim() || '0',
          accepted: !!isAccepted
        };
      });

      const formattedAnswers = data.answers.map((a, i) =>
        `Answer ${i + 1} (${a.votes} votes${a.accepted ? ', ACCEPTED' : ''}):\n${a.body}`
      ).join('\n\n---\n\n');

      return _formatExtraction(data, `Stack Overflow: ${data.title}\nTags: ${data.tags.join(', ')}\nQuestion Votes: ${data.questionVotes}\n\nQuestion:\n${data.question}\n\n${formattedAnswers}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== YOUTUBE EXTRACTOR ====================

  function _extractYouTube() {
    try {
      const data = { type: 'youtube' };

      // Video title
      data.title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1')?.textContent?.trim() ||
                   document.querySelector('meta[name="title"]')?.content ||
                   document.title;

      // Channel
      data.channel = document.querySelector('#channel-name a, ytd-channel-name a')?.textContent?.trim() || '';

      // Description
      const descEl = document.querySelector('#description-inline-expander .content, #description ytd-text-inline-expander span');
      data.description = descEl?.innerText?.trim()?.substring(0, 2000) || '';

      // Video metadata
      const viewCount = document.querySelector('.view-count, ytd-video-view-count-renderer span');
      data.views = viewCount?.textContent?.trim() || '';

      // Chapters (if available)
      const chapters = document.querySelectorAll('ytd-macro-markers-list-item-renderer');
      data.chapters = Array.from(chapters).slice(0, 20).map(ch => {
        const time = ch.querySelector('#time')?.textContent?.trim();
        const title = ch.querySelector('#details h4')?.textContent?.trim();
        return time && title ? `${time} - ${title}` : '';
      }).filter(Boolean);

      // Transcript (if panel is open)
      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      data.transcript = Array.from(transcriptSegments).map(seg => {
        const time = seg.querySelector('.segment-timestamp')?.textContent?.trim();
        const text = seg.querySelector('.segment-text')?.textContent?.trim();
        return time && text ? `[${time}] ${text}` : text || '';
      }).filter(Boolean).join(' ').substring(0, 4000);

      // Comments (top few)
      const comments = document.querySelectorAll('#content-text');
      data.topComments = Array.from(comments).slice(0, 5).map(el => el.textContent.trim().substring(0, 200));

      return _formatExtraction(data, `YouTube Video: ${data.title}\nChannel: ${data.channel}\nViews: ${data.views}\n\nDescription:\n${data.description}\n\nChapters:\n${data.chapters.join('\n') || 'No chapters'}\n\nTranscript:\n${data.transcript || 'Transcript not available (not expanded)'}\n\nTop Comments:\n${data.topComments.join('\n---\n') || 'No comments loaded'}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== ARXIV EXTRACTOR ====================

  function _extractArxiv() {
    try {
      const data = { type: 'arxiv' };

      // Paper title
      data.title = document.querySelector('.title.mathjax, h1.title')?.textContent?.replace('Title:', '').trim() || document.title;

      // Authors
      const authors = document.querySelectorAll('.authors a');
      data.authors = Array.from(authors).map(el => el.textContent.trim());

      // Abstract
      data.abstract = document.querySelector('.abstract.mathjax, blockquote.abstract')?.textContent?.replace('Abstract:', '').trim()?.substring(0, 3000) || '';

      // Subjects / categories
      const subjects = document.querySelector('.subjects, .tablecell.subjects');
      data.subjects = subjects?.textContent?.trim() || '';

      // Submission date
      const dateEl = document.querySelector('.dateline');
      data.date = dateEl?.textContent?.trim() || '';

      // Comments (if any)
      const commentsEl = document.querySelector('.metatable .comments');
      data.comments = commentsEl?.textContent?.trim() || '';

      return _formatExtraction(data, `Research Paper: ${data.title}\nAuthors: ${data.authors.join(', ')}\nDate: ${data.date}\nSubjects: ${data.subjects}\n\nAbstract:\n${data.abstract}\n\nComments: ${data.comments}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== DOCUMENTATION EXTRACTOR ====================

  function _extractDocumentation() {
    try {
      const data = { type: 'documentation' };

      // Page title / API name
      data.title = document.querySelector('h1, .page-title, .doc-title')?.textContent?.trim() || document.title;

      // Breadcrumb / navigation path
      const breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a, nav[aria-label="Breadcrumb"] a');
      data.breadcrumb = Array.from(breadcrumbs).map(el => el.textContent.trim()).join(' > ');

      // Main content with code examples preserved
      const mainContent = document.querySelector('main, article, [role="main"], .content, .doc-content, .markdown-body');
      data.content = mainContent?.innerText?.trim()?.substring(0, 6000) || '';

      // Code examples specifically
      const codeExamples = document.querySelectorAll('pre code, .highlight code, .code-sample code');
      data.codeExamples = Array.from(codeExamples).slice(0, 8).map(el => el.textContent.trim().substring(0, 500));

      // API signature / method signature
      const signatures = document.querySelectorAll('.function-signature, .method-signature, dt code, .api-signature');
      data.signatures = Array.from(signatures).slice(0, 10).map(el => el.textContent.trim());

      // Parameters table
      const paramRows = document.querySelectorAll('.parameters tr, table.parameters tr, .param-row');
      data.parameters = Array.from(paramRows).slice(0, 20).map(row => row.textContent.trim().substring(0, 200));

      return _formatExtraction(data, `Documentation: ${data.title}\nPath: ${data.breadcrumb}\n\n${data.content}\n\nAPI Signatures:\n${data.signatures.join('\n')}\n\nCode Examples:\n${data.codeExamples.join('\n---\n')}\n\nParameters:\n${data.parameters.join('\n')}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== JOB LISTING EXTRACTOR ====================

  function _extractJobListing() {
    try {
      const data = { type: 'job_listing' };
      const url = window.location.href.toLowerCase();

      if (url.includes('linkedin.com')) {
        data.title = document.querySelector('.job-details-jobs-unified-top-card__job-title, .top-card-layout__title')?.textContent?.trim() || document.title;
        data.company = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .topcard__org-name-link')?.textContent?.trim() || '';
        data.location = document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet')?.textContent?.trim() || '';
        const descEl = document.querySelector('.jobs-description__content, .show-more-less-html__markup, .description__text');
        data.description = descEl?.innerText?.trim()?.substring(0, 4000) || '';

        // Skills
        const skills = document.querySelectorAll('.job-details-how-you-match__skills-item, .skill-match-text');
        data.skills = Array.from(skills).map(el => el.textContent.trim());
      } else {
        // Generic job page extraction
        data.title = document.querySelector('h1, .jobTitle, .job-title')?.textContent?.trim() || document.title;
        data.company = document.querySelector('.company, .employer, [data-company]')?.textContent?.trim() || '';
        const mainEl = document.querySelector('main, article, .job-description, .jobsearch-jobDescriptionText, #jobDescription');
        data.description = mainEl?.innerText?.trim()?.substring(0, 4000) || '';
        data.skills = [];
      }

      return _formatExtraction(data, `Job: ${data.title}\nCompany: ${data.company}\nLocation: ${data.location || 'Not specified'}\n\nDescription:\n${data.description}\n\nSkills Mentioned:\n${data.skills.join(', ') || 'Check description'}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== ARTICLE / BLOG EXTRACTOR ====================

  function _extractArticle() {
    try {
      const data = { type: 'article' };

      data.title = document.querySelector('h1, article h1, .post-title')?.textContent?.trim() || document.title;

      // Author
      data.author = document.querySelector('[rel="author"], .author-name, .post-author, [class*="author"]')?.textContent?.trim() || '';

      // Publication date
      data.date = document.querySelector('time, [datetime], .post-date, .publish-date')?.textContent?.trim() ||
                  document.querySelector('time')?.getAttribute('datetime') || '';

      // Main content
      const articleEl = document.querySelector('article, .post-content, .article-content, .entry-content, [class*="article-body"]');
      data.content = articleEl?.innerText?.trim()?.substring(0, 6000) || '';

      // Tags
      const tags = document.querySelectorAll('.post-tag, .tag, [rel="tag"]');
      data.tags = Array.from(new Set(Array.from(tags).map(el => el.textContent.trim()))).slice(0, 10);

      // Reading time estimate
      const wordCount = data.content.split(/\s+/).length;
      data.readingTime = Math.ceil(wordCount / 200);

      return _formatExtraction(data, `Article: ${data.title}\nAuthor: ${data.author}\nDate: ${data.date}\nTags: ${data.tags.join(', ')}\nEst. Reading Time: ${data.readingTime} min\n\nContent:\n${data.content}`);
    } catch (e) {
      return null;
    }
  }

  // ==================== HELPER ====================

  function _formatExtraction(data, text) {
    return {
      ...data,
      extractedText: text.substring(0, MAX_EXTRACT_LENGTH)
    };
  }

  // ==================== MAIN DISPATCHER ====================

  /**
   * Attempt site-specific extraction based on URL.
   * @param {string} url - Current page URL
   * @param {string} mode - Detected page mode
   * @returns {Object|null} Extracted data or null if no specific extractor
   */
  function extract(url, mode) {
    const u = (url || '').toLowerCase();

    try {
      // GitHub PR
      if (u.includes('github.com') && u.includes('/pull')) {
        return _extractGitHubPR();
      }

      // GitHub Repo
      if (u.includes('github.com') && !u.includes('/pull') && !u.includes('/issues/')) {
        return _extractGitHubRepo();
      }

      // LeetCode
      if (u.includes('leetcode.com/problems/')) {
        return _extractLeetCode();
      }

      // Stack Overflow
      if (u.includes('stackoverflow.com/questions/')) {
        return _extractStackOverflow();
      }

      // YouTube
      if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) {
        return _extractYouTube();
      }

      // arXiv
      if (u.includes('arxiv.org/abs/') || u.includes('arxiv.org/pdf/')) {
        return _extractArxiv();
      }

      // Documentation sites
      if (mode === 'Documentation') {
        return _extractDocumentation();
      }

      // Job listings
      if (mode === 'Job Analysis') {
        return _extractJobListing();
      }

      // Articles
      if (mode === 'Article') {
        return _extractArticle();
      }

    } catch (e) {
      console.warn('🐱 Site extractor failed, falling back to generic:', e);
    }

    return null;
  }

  // ==================== PUBLIC API ====================

  return {
    extract
  };
})();
