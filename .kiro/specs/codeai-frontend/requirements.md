# Requirements Document

## Introduction

CodeAI is a guided learning interface for K-12 students who learn coding and AI concepts by building a small website or app. This specification covers the **frontend/UI** of the platform for a hackathon MVP (Breaking Barriers, Team 10).

The frontend is a single-screen, three-column layout that keeps the full learning loop — type a requirement, generate code, run it, preview the result, and get help — visible at once. The interface presents an adaptive lesson made of levels and learning objectives, reflects state produced by backend validation and routing services, surfaces mastery and outcomes as first-class information, and hosts an AI tutor that offers proactive nudges and scaffolded hints rather than direct answers. The UI must degrade gracefully when adaptive services fail, handle empty/loading/error states, and remain accessible to a young audience.

This document scopes **frontend concerns only**. Backend services (validation, routing, content filtering, deployment execution) are treated as external systems the frontend communicates with and whose state the UI reflects.

## Glossary

- **Learning_UI**: The single-screen CodeAI frontend application that renders the three-column layout and orchestrates student interactions.
- **Top_Bar**: The header region containing the project name, progress meter, Save action, and Deploy action.
- **Progress_Meter**: The Top_Bar component that shows the count and proportion of learning objectives completed in the current lesson.
- **Lesson_Panel**: The left-column region that renders lesson content and the objectives checklist.
- **Objectives_Checklist**: The list of learning objectives for the current lesson, with the active objective visually highlighted.
- **Outcomes_Panel**: The left-column "My outcomes" region that displays concepts mastered, hints used, time on task, and the mastery score.
- **Mastery_Score**: A numeric indicator (0–100) of the student's current mastery, derived from the backend validation signal.
- **Progress_Report**: A separate, full outcomes view opened from a link in the Outcomes_Panel.
- **Requirements_Box**: The center-column plain-language text input where a student describes what to build.
- **Ask_Button**: The center-column control that routes a free-form question to the AI_Tutor.
- **Code_Editor**: The center-column editor with Code, Files, and Build log tabs.
- **Build_Button**: The center-column Run/Build control that triggers a build and sandbox deployment.
- **Status_Strip**: The center-column region showing the latest build result and the live sandbox URL.
- **Preview_Panel**: The right-column live preview that re-renders as the project changes, with web and phone viewport toggles.
- **AI_Tutor**: The right-column assistant that provides scaffolded hints, answers questions, and issues proactive nudges.
- **Nudge_Bubble**: A proactive AI_Tutor message offered when a stuck state is detected, before the student asks for help.
- **Scaffolded_Hint**: A step-revealed hint (for example "step 1 of 3") that guides without supplying the full answer.
- **Validation_Service**: The external backend service that evaluates student work and returns a mastery signal.
- **Routing_Service**: The external backend service that selects the next skill or level based on the mastery signal.
- **Fallback_Path**: A non-adaptive, fixed lesson sequence the Learning_UI presents when Validation_Service or Routing_Service is unavailable.
- **Level**: A single adaptive step within a lesson, targeting a learning objective.
- **Learning_Objective**: A named outcome a lesson is designed to teach, tracked in the Objectives_Checklist.
- **Content_Filter**: The external safety service applied to student input and AI_Tutor output.
- **Stuck_State**: A UI-detected condition indicating the student is not progressing (for example repeated failed builds or extended inactivity on the active objective).

## Requirements

### Requirement 1: Three-column single-screen layout

**User Story:** As a K-12 student, I want the lesson, my code, and the preview and tutor on one screen, so that I can learn, build, and get help without navigating away.

#### Acceptance Criteria

1. WHILE the viewport width is 768 pixels or greater, THE Learning_UI SHALL render the Top_Bar, a left column, a center column, and a right column simultaneously within a single viewport with no horizontal page scrolling required to view all three columns.
2. THE left column SHALL contain the Lesson_Panel and the Outcomes_Panel, with the Lesson_Panel positioned above the Outcomes_Panel.
3. THE center column SHALL contain the Requirements_Box, the Ask_Button, the Code_Editor, the Build_Button, and the Status_Strip, in top-to-bottom order: Requirements_Box, Ask_Button, Code_Editor, Build_Button, Status_Strip.
4. THE right column SHALL contain the Preview_Panel and the AI_Tutor, with the Preview_Panel positioned above the AI_Tutor.
5. WHILE the viewport width is below 768 pixels, THE Learning_UI SHALL stack the three columns vertically in top-to-bottom order: lesson column, code column, preview-and-tutor column, with no horizontal page scrolling required.
6. WHEN content within any single column exceeds the available vertical space of that column, THE Learning_UI SHALL provide independent vertical scrolling within that column while keeping the other columns fixed in position.

### Requirement 2: Lesson progress meter

**User Story:** As a student, I want to see how many objectives I have completed, so that I feel momentum.

#### Acceptance Criteria

1. WHILE the current lesson has one or more defined Learning_Objectives, THE Progress_Meter SHALL display the count of completed Learning_Objectives and the total count of Learning_Objectives for the current lesson as two non-negative integer values, where the completed count ranges from 0 to the total count.
2. WHEN a Learning_Objective transitions to completed, THE Progress_Meter SHALL update the displayed completed count within 1 second (1000 milliseconds) to reflect the new completed count.
3. WHEN a Learning_Objective transitions from completed to not completed, THE Progress_Meter SHALL update the displayed completed count within 1 second (1000 milliseconds) to reflect the decreased completed count.
4. WHILE the current lesson has zero defined Learning_Objectives, THE Progress_Meter SHALL display an empty-state label indicating no objectives are available and SHALL NOT display a numeric count.
5. IF the completed count or total count for the current lesson cannot be retrieved, THEN THE Progress_Meter SHALL display an error-state label indicating the progress is unavailable and SHALL retain any previously displayed count until a valid count is retrieved.

### Requirement 3: Lesson content and objectives checklist

**User Story:** As a student, I want to read the lesson and see my objectives, so that I know what I am learning and what to do next.

#### Acceptance Criteria

1. THE Lesson_Panel SHALL render the content of the current Level.
2. THE Objectives_Checklist SHALL display each Learning_Objective of the current lesson with a visually distinct completed or not-completed indicator reflecting that Learning_Objective's completion status.
3. THE Objectives_Checklist SHALL render the active Learning_Objective in a visual state distinct from all non-active Learning_Objectives.
4. WHEN the Routing_Service advances the student to a new Level, THE Lesson_Panel SHALL replace the displayed content with the content of the new Level.
5. WHILE lesson content is loading, THE Lesson_Panel SHALL display a loading indicator for up to 10 seconds.
6. IF lesson content fails to load or does not load within 10 seconds, THEN THE Lesson_Panel SHALL display an error message and a retry control that restarts the load when activated.

### Requirement 4: Outcomes panel and mastery score

**User Story:** As a student, I want to see my mastery, hints used, and time on task, so that my progress is clear to me and my mentor.

#### Acceptance Criteria

1. THE Outcomes_Panel SHALL display the number of concepts mastered as a non-negative integer, the number of hints used as a non-negative integer, the time on task in HH:MM:SS format, and the Mastery_Score as a value from 0 to 100.
2. WHEN the Validation_Service returns an updated mastery signal, THE Outcomes_Panel SHALL set the displayed Mastery_Score to the new signal value within 1 second of receipt.
3. WHEN a Scaffolded_Hint is revealed, THE Outcomes_Panel SHALL increment the displayed hints-used count by 1 within 1 second.
4. WHEN the student activates the Progress_Report link, THE Outcomes_Panel SHALL open the Progress_Report.
5. WHILE no mastery signal has been received for the current lesson, THE Outcomes_Panel SHALL display the Mastery_Score as an unavailable-state label instead of a numeric value.
6. IF the Validation_Service returns an error or no response for a mastery update, THEN THE Outcomes_Panel SHALL retain the last displayed Mastery_Score and display an indication that the update failed.
7. IF the Progress_Report fails to open, THEN THE Outcomes_Panel SHALL retain its current displayed values and display an error indication.

### Requirement 5: Plain-language requirements input

**User Story:** As a student, I want to describe what I want to build in plain language, so that the platform helps turn my words into code.

#### Acceptance Criteria

1. THE Requirements_Box SHALL accept free-form text input from the student of up to 5,000 characters.
2. IF the student submits empty or whitespace-only text from the Requirements_Box, THEN THE Learning_UI SHALL display a message indicating that input is required and SHALL NOT send the text for further processing.
3. WHEN the student submits non-empty text from the Requirements_Box, THE Learning_UI SHALL send the text to the Content_Filter before any further processing.
4. IF the Content_Filter rejects the submitted text, THEN THE Learning_UI SHALL display a message indicating the input was not accepted and SHALL retain the student's text for editing.
5. WHILE a requirements submission is in progress, THE Learning_UI SHALL disable the Requirements_Box submit control and display a processing indicator.
6. IF a requirements submission does not complete within 30 seconds, THEN THE Learning_UI SHALL stop the processing indicator, re-enable the submit control, display a message indicating the submission could not be completed, and retain the student's text.
7. WHEN generated code is returned for a requirements submission, THE Code_Editor SHALL display the generated code, and THE Learning_UI SHALL stop the processing indicator and re-enable the submit control.
8. IF a requirements submission completes without returning generated code, THEN THE Learning_UI SHALL display a message indicating that no code was generated and re-enable the submit control.

### Requirement 6: Ask a question

**User Story:** As a student, I want to ask the tutor a question, so that I can get help when I am unsure.

#### Acceptance Criteria

1. WHEN the student activates the Ask_Button with a question containing 1 to 2000 characters, THE Learning_UI SHALL send the question to the Content_Filter within 1 second.
2. IF the student activates the Ask_Button with an empty question or a question exceeding 2000 characters, THEN THE Learning_UI SHALL display a message indicating the question is invalid and SHALL NOT send the question to the Content_Filter.
3. WHEN the Content_Filter accepts a question, THE Learning_UI SHALL route the accepted question to the AI_Tutor within 1 second.
4. IF the Content_Filter rejects a question, THEN THE AI_Tutor SHALL display a message indicating the question was not accepted and SHALL NOT route the question to the AI_Tutor.
5. IF the Content_Filter does not return a result within 10 seconds, THEN THE Learning_UI SHALL display a message indicating the question could not be processed and SHALL preserve the student's entered question in the input field.

### Requirement 7: Code editor with tabs

**User Story:** As a student, I want to view and edit my code, files, and build log, so that I can understand and change my project.

#### Acceptance Criteria

1. THE Code_Editor SHALL provide exactly three tabs: a Code tab, a Files tab, and a Build log tab.
2. WHEN the student selects a tab, THE Code_Editor SHALL display the content associated with the selected tab within 500 milliseconds and visually indicate the selected tab as active.
3. WHILE a tab is selected, THE Code_Editor SHALL display the content of only that tab and hide the content of the other two tabs.
4. WHILE the Code tab is selected, THE Code_Editor SHALL allow the student to edit code within the Code tab.
5. WHILE the Files tab is selected, THE Code_Editor SHALL display the content of the Files tab as read-only.
6. WHILE the Build log tab is selected, THE Code_Editor SHALL display the content of the Build log tab as read-only.
7. WHEN the student edits code in the Code tab, THE Preview_Panel SHALL mark the preview as out of date and display an out-of-date indicator until the next build completes.
8. WHEN a build completes successfully after the preview was marked out of date, THE Preview_Panel SHALL remove the out-of-date indicator.
9. IF the student selects a tab whose content is unavailable, THEN THE Code_Editor SHALL display a message indicating that the content could not be loaded and retain the previously selected tab's content.

### Requirement 8: Build and deploy feedback

**User Story:** As a student, I want immediate feedback when I build, so that I know whether my project works and where it is deployed.

#### Acceptance Criteria

1. WHEN the student activates the Build_Button, THE Learning_UI SHALL start a build and display a build-in-progress indicator in the Status_Strip within 1 second of the activation.
2. WHEN a build completes successfully, THE Status_Strip SHALL display a success result and the live sandbox URL.
3. IF a build fails, THEN THE Status_Strip SHALL display a failure result and SHALL make the build errors available in the Build log tab.
4. WHEN a build completes successfully, THE Preview_Panel SHALL re-render the project from the latest build.
5. WHILE a build is in progress, THE Learning_UI SHALL disable the Build_Button, and WHEN the build completes with any result, THE Learning_UI SHALL re-enable the Build_Button.
6. IF a build does not complete within 120 seconds of starting, THEN THE Status_Strip SHALL display a failure result indicating a build timeout and THE Learning_UI SHALL re-enable the Build_Button.

### Requirement 9: Save and deploy actions

**User Story:** As a student, I want to save and deploy my project from the top bar, so that I do not lose work and can share a live version.

#### Acceptance Criteria

1. WHEN the student activates the Save action, THE Learning_UI SHALL persist the current project state within 5 seconds and display a save-confirmation indicator for at least 3 seconds.
2. IF a save operation does not complete within 5 seconds or returns a failure result, THEN THE Learning_UI SHALL display an error message indicating the save failed, SHALL indicate that unsaved changes remain, and SHALL retain the current project state without discarding unsaved changes.
3. WHEN the student activates the Deploy action, THE Learning_UI SHALL start a deployment and display a deploy-in-progress indicator until the deployment completes or fails.
4. WHEN a deployment completes successfully, THE Status_Strip SHALL display the live sandbox URL and SHALL remove the deploy-in-progress indicator.
5. IF a deployment fails or does not complete within 120 seconds, THEN THE Learning_UI SHALL display an error message indicating the deployment failed, SHALL remove the deploy-in-progress indicator, and SHALL retain the last successfully deployed sandbox URL in the Status_Strip if one exists.

### Requirement 10: Live preview with viewport toggles

**User Story:** As a student, I want to see my project as it will look on web and phone, so that I understand how it appears to real users.

#### Acceptance Criteria

1. THE Preview_Panel SHALL render the current project output.
2. THE Preview_Panel SHALL provide a web viewport toggle and a phone viewport toggle.
3. WHILE no viewport toggle has been selected since the project output first loaded, THE Preview_Panel SHALL render the project output using the web viewport as the default.
4. WHEN the student selects the web viewport toggle, THE Preview_Panel SHALL render the project output at a width of 1280 pixels and a height of 800 pixels.
5. WHEN the student selects the phone viewport toggle, THE Preview_Panel SHALL render the project output at a width of 375 pixels and a height of 667 pixels.
6. WHEN the project output changes, THE Preview_Panel SHALL re-render the project output at the dimensions of the currently selected viewport within 2 seconds.
7. WHILE the preview is re-rendering, THE Preview_Panel SHALL display a rendering indicator until rendering completes or fails.
8. IF rendering the project output fails, THEN THE Preview_Panel SHALL stop displaying the rendering indicator, retain the last successfully rendered output, and display an error message indicating that the preview could not be rendered.
9. WHILE no project output exists, THE Preview_Panel SHALL display an empty-state message prompting the student to describe and build a project.

### Requirement 11: AI tutor scaffolded hints

**User Story:** As a student, I want hints revealed step by step, so that I still do the thinking and keep learning.

#### Acceptance Criteria

1. WHEN the AI_Tutor begins displaying a Scaffolded_Hint, THE AI_Tutor SHALL display only the first step and SHALL indicate the current step number and the total step count.
2. THE AI_Tutor SHALL provide a control to reveal the next step of a Scaffolded_Hint.
3. WHEN the student requests the next step AND at least one unrevealed step remains, THE AI_Tutor SHALL reveal the next single unrevealed step and SHALL update the displayed current step number.
4. IF the student requests the next step AND no unrevealed steps remain, THEN THE AI_Tutor SHALL keep the final step displayed and SHALL present an indication that no further steps are available.
5. THE AI_Tutor SHALL send AI_Tutor output through the Content_Filter before displaying the output to the student.
6. IF the Content_Filter blocks AI_Tutor output, THEN THE AI_Tutor SHALL withhold the blocked output from display and SHALL present an indication that the content was not available.
7. THE AI_Tutor SHALL provide a free-form chat input that accepts between 1 and 2000 characters per message for the student to send messages.

### Requirement 12: Proactive nudge on stuck state

**User Story:** As a student, I want the tutor to notice when I am stuck and offer help, so that I can get moving without having to ask.

#### Acceptance Criteria

1. WHEN a Stuck_State is detected for the active Learning_Objective, THE AI_Tutor SHALL display a Nudge_Bubble offering a hint within 1 second of detection.
2. WHILE a Nudge_Bubble is displayed, THE AI_Tutor SHALL present a control to accept the offered hint and a control to dismiss the Nudge_Bubble.
3. WHEN the student accepts a Nudge_Bubble hint, THE AI_Tutor SHALL present the hint as a Scaffolded_Hint and remove the Nudge_Bubble from the display.
4. WHEN the student dismisses a Nudge_Bubble, THE AI_Tutor SHALL remove the Nudge_Bubble from the display within 500 milliseconds.
5. IF a Stuck_State remains active or is re-detected for the same Learning_Objective within 60 seconds after a Nudge_Bubble is dismissed, THEN THE AI_Tutor SHALL NOT display another Nudge_Bubble for that Learning_Objective until the 60-second interval has elapsed.

### Requirement 13: Adaptive routing and validation state

**User Story:** As a student, I want the interface to reflect how my work is evaluated and what comes next, so that the adaptive path is understandable.

#### Acceptance Criteria

1. WHILE the Validation_Service is evaluating submitted work, THE Learning_UI SHALL display a validating-state indicator for the active Learning_Objective within 1 second of submission.
2. WHEN the Validation_Service returns a passing mastery signal for the active Learning_Objective, THE Objectives_Checklist SHALL mark the active Learning_Objective as completed within 1 second of receiving the signal.
3. WHEN the Validation_Service returns a result for the active Learning_Objective, THE Learning_UI SHALL clear the validating-state indicator within 1 second of receiving the result.
4. IF the Validation_Service returns a non-passing mastery signal for the active Learning_Objective, THEN THE Learning_UI SHALL retain the active Learning_Objective as not completed in the Objectives_Checklist and display a not-passed indication to the student within 1 second of receiving the signal.
5. WHEN the Routing_Service selects the next Level, THE Learning_UI SHALL present the selected Level as the active Level within 1 second of the selection.
6. WHILE the Routing_Service is selecting the next Level, THE Learning_UI SHALL display a routing-state indicator within 1 second of the selection starting.
7. WHEN the Routing_Service completes Level selection, THE Learning_UI SHALL clear the routing-state indicator within 1 second of completion.
8. IF the Routing_Service fails to select the next Level, THEN THE Learning_UI SHALL clear the routing-state indicator, retain the current active Level unchanged, and display an error indication that routing did not complete within 1 second of the failure.

### Requirement 14: Graceful fallback when adaptive services fail

**User Story:** As a student, I want to keep learning even when the adaptive system is down, so that a service outage does not block my lesson.

#### Acceptance Criteria

1. IF the Validation_Service does not return a response within 10 seconds of work being submitted, or returns an error response, THEN THE Learning_UI SHALL present the Fallback_Path within 2 seconds of detecting the failure, SHALL retain the submitted work without loss, and SHALL display a notice indicating that adaptive feedback is temporarily unavailable.
2. IF the Routing_Service does not return a response within 10 seconds of the next Level being requested, or returns an error response, THEN THE Learning_UI SHALL advance the student to the next Level along the Fallback_Path within 2 seconds of detecting the failure.
3. WHILE the Learning_UI is presenting the Fallback_Path, THE Learning_UI SHALL continue to render lesson content, the Code_Editor, the Build_Button, and the Preview_Panel.
4. WHEN the Validation_Service and the Routing_Service each return a successful response within 10 seconds to a health request, THE Learning_UI SHALL resume the adaptive path within 2 seconds and SHALL remove the fallback notice.
5. WHILE the Learning_UI is presenting the Fallback_Path, THE Learning_UI SHALL re-check availability of the Validation_Service and the Routing_Service at intervals not exceeding 30 seconds.

### Requirement 15: Accessibility for a K-12 audience

**User Story:** As a young or first-time learner, I want the interface to be readable and operable, so that I can use it regardless of how I navigate.

#### Acceptance Criteria

1. THE Learning_UI SHALL provide a programmatically associated text alternative for each non-text interactive control, where the text alternative describes the control's purpose in no more than 150 characters.
2. THE Learning_UI SHALL allow the student to operate and activate the Top_Bar actions, the Requirements_Box, the Ask_Button, the Code_Editor tabs, the Build_Button, the Preview_Panel toggles, and the AI_Tutor chat input using only a keyboard, without requiring a pointing device.
3. IF keyboard focus moves into any Learning_UI component, THEN THE Learning_UI SHALL allow keyboard focus to move away from that component using standard keyboard navigation without requiring a pointing device.
4. THE Learning_UI SHALL render body text and interactive labels with a contrast ratio of at least 4.5 to 1 against their background, and SHALL render large-scale text (at least 18 point, or 14 point bold) with a contrast ratio of at least 3 to 1 against its background.
5. WHEN a status changes in the Status_Strip, the Progress_Meter, or the Outcomes_Panel, THE Learning_UI SHALL announce the changed content through an assistive-technology live region within 2 seconds of the change, without moving keyboard focus.
6. WHILE a control has keyboard focus, THE Learning_UI SHALL render a visible focus indicator on that control with a contrast ratio of at least 3 to 1 against the adjacent unfocused state.
