# 1. External Entities

| Entity | Role | Data it sends into the system | Data it receives from the system |
|---|---|---|---|
| ADMIN | Administrative user of the system | Dish, Users, Feedback, AI API, Image | None explicitly shown |
| USER | End user who uploads images, saves dishes, and provides feedback | Image, Users' Feedback, Save dish | Dishes, User's Feedback, likely Save dish |
| AI | External artificial-intelligence service | AI API, Image, Findings | AI API, Image |
| MEDIA STORAGE | External storage for media | Image | Image |

# 2. Processes

| Process No. | Process Name | Inputs (data + source) | Outputs (data + destination) | One-sentence description of what it does |
|---|---|---|---|---|
| 1 | Manage Dish | Dish from ADMIN | Dish to D capampangan | Administers dish data from the administrator. |
| 2 | Manage Accounts | Users from ADMIN | Users to D users | Administers account data for the system. |
| 3 | Manage Feedback | Feedback from ADMIN | Feedback to D feedback_questions | Administers feedback-question data. |
| 4 | Manage AI API | AI API from ADMIN | AI API to D api | Administers the AI API configuration or data. |
| 5 | Inputs Media | Image from ADMIN | Image to MEDIA STORAGE | Accepts media input from the administrator and sends it to media storage. |
| 6 | Connects AI | AI API from D api and AI | AI API to D api and AI | Connects the system to the external AI service using AI API data. |
| 7 | Uploads Image | Image from USER | Image to AI | Accepts an image upload from a user for processing. |
| 8 | Analyze Image | Image from MEDIA STORAGE and AI; Image from the upload path | Findings to Match Findings; Image-related communication to AI | Sends image data to AI and receives or derives findings. |
| 9 | Match Findings | Findings from Analyze Image | Dishes / Findings toward Compile Results | Matches the findings produced by image analysis. |
| 10 | Compile Results | Dish from D capampangan; Dishes / Findings from Match Findings; Users from D users | Dishes / compiled results to Show Dishes | Compiles dish and user-related findings for display. |
| 11 | Show Dishes | Dishes from Compile Results | Dish to Save Dish; feedback-related output toward the feedback area; Dishes / Feedback to USER | Presents compiled dishes to the user and exposes related feedback actions. |
| 12 | Save Dish | Dish from Show Dishes and USER; Save dish from USER | Save dish to D saved_recipes and USER | Saves a selected dish and communicates the saved dish to the user. |
| 13 | Fetch Questions | Users' Feedback / Feedback Questions from USER and D feedback_questions | Feedback Questions toward Sends Feedback | Retrieves feedback questions for the feedback workflow. |
| 14 | Sends Feedback | Feedback Questions / feedback data from Fetch Questions and USER feedback flow | User's Feedback to USER | Sends or forwards feedback in the feedback process. |

# 3. Data Stores

| Store Name | Data it holds | Processes that write to it | Processes that read from it |
|---|---|---|---|
| capampangan | Dish | 1. Manage Dish | 10. Compile Results |
| users | Users | 2. Manage Accounts | 10. Compile Results |
| feedback_questions | Feedback; Feedback Questions | 3. Manage Feedback | 13. Fetch Questions |
| api | AI API | 4. Manage AI API; 6. Connects AI | 6. Connects AI |
| saved_recipes | Save dish | 12. Save Dish | 12. Save Dish |

# 4. Data Flows

| # | Data Label | Source | Destination |
|---|---|---|---|
| 1 | Dish | ADMIN | 1. Manage Dish |
| 2 | Dish | 1. Manage Dish | D capampangan |
| 3 | Dish | D capampangan | 10. Compile Results |
| 4 | Users | ADMIN | 2. Manage Accounts |
| 5 | Users | 2. Manage Accounts | D users |
| 6 | Users | D users | 10. Compile Results |
| 7 | Feedback | ADMIN | 3. Manage Feedback |
| 8 | Feedback | 3. Manage Feedback | D feedback_questions |
| 9 | Feedback Questions | D feedback_questions | 13. Fetch Questions |
| 10 | AI API | ADMIN | 4. Manage AI API |
| 11 | AI API | 4. Manage AI API | D api |
| 12 | AI API | D api | 6. Connects AI |
| 13 | AI API | 6. Connects AI | AI |
| 14 | AI API | AI | 6. Connects AI |
| 15 | Image | ADMIN | 5. Inputs Media |
| 16 | Image | 5. Inputs Media | MEDIA STORAGE |
| 17 | Image | MEDIA STORAGE | 8. Analyze Image |
| 18 | Image | AI | 8. Analyze Image |
| 19 | Image | USER | 7. Uploads Image |
| 20 | Image | 7. Uploads Image | AI |
| 21 | Findings | 8. Analyze Image | 9. Match Findings |
| 22 | Dishes | 9. Match Findings | 10. Compile Results |
| 23 | Dish | 10. Compile Results | 11. Show Dishes |
| 24 | Dishes | 11. Show Dishes | USER |
| 25 | Dish | 11. Show Dishes | 12. Save Dish |
| 26 | Save dish | USER | 12. Save Dish |
| 27 | Save dish | 12. Save Dish | D saved_recipes |
| 28 | Save dish | D saved_recipes | 12. Save Dish |
| 29 | Save dish | 12. Save Dish | USER |
| 30 | Users' Feedback | USER | 13. Fetch Questions |
| 31 | Feedback Questions | 13. Fetch Questions | 14. Sends Feedback |
| 32 | User's Feedback | 14. Sends Feedback | USER |

# 5. Process Groupings

| Group | Purpose | Process numbers |
|---|---|---|
| Administrative data management | Maintains dishes, accounts, feedback questions, AI API settings, and media input | 1. Manage Dish; 2. Manage Accounts; 3. Manage Feedback; 4. Manage AI API; 5. Inputs Media |
| AI integration and image analysis | Connects to AI and analyzes or matches image findings | 6. Connects AI; 7. Uploads Image; 8. Analyze Image; 9. Match Findings |
| Result compilation and display | Compiles and presents dish results to the user | 10. Compile Results; 11. Show Dishes |
| Saved dish workflow | Saves selected dishes and persists the saved result | 12. Save Dish |
| User feedback workflow | Fetches feedback questions and sends feedback | 13. Fetch Questions; 14. Sends Feedback |

# 6. Rule Check

- **Every process has at least one input and one output:** No violation is apparent; each numbered process has at least one visible incoming and one visible outgoing flow.
- **No flow goes directly between two external entities or two data stores:** No violation is apparent. All observed direct connections are entity-to-process, process-to-store, store-to-process, or process-to-process.
- **Every arrow is labeled:** The visible major arrows appear to carry labels. However, several branch/crossing segments show arrowheads without a clearly readable label nearby, so label coverage cannot be confirmed from this image alone.
- **Every process is numbered and named with a verb phrase:** No violation is apparent; processes 1-14 are numbered and use names beginning with a verb: Manage, Inputs, Connects, Uploads, Analyze, Match, Compile, Show, Save, Fetch, and Sends.

# 7. Unclear or Ambiguous Parts

- The store name shown beside process 1 is visible as **capampangan**. It should be transcribed exactly as shown; it may look misspelled or truncated.
- The exact return path and destination of the **Users** store flow are unclear where the store connection branches toward the compile-results area.
- The exact direction and read/write meaning of some **Dish** flows around processes 10-12 and the `saved_recipes` store are difficult to confirm because the lines cross.
- The exact Image path involving process 5, MEDIA STORAGE, process 7, process 8, and AI is ambiguous at the middle-left crossings; it is unclear whether one shared line represents multiple labeled flows or whether every branch is separately labeled.
- The line between AI and process 8 is labeled **Image** in the visible upper area, but the direction of every branch at the AI entity and the return arrows is not completely certain.
- The relationship between process 9 **Match Findings** and process 10 **Compile Results** is not clear enough to distinguish whether the label reads **Dishes**, **Dish**, or another term.
- It is unclear whether the flow from process 12 to USER and the flow from USER to process 12 should be read as **Save dish** in both directions.
- The lower feedback area has dense crossings. It is uncertain whether USER sends **Users' Feedback** to process 13, whether process 13 sends **Feedback Questions** to process 14, or whether the two visible labels belong to a different adjacent branch.
- The exact read and write direction for `saved_recipes` around process 12 is ambiguous.
- Several arrowheads near line crossings do not have legible labels or a clearly visible arrowhead; these segments should not be treated as confirmed labeled flows.
