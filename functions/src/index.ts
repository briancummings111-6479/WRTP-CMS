/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control...
setGlobalOptions({ maxInstances: 10 });

export * from "./ocr";
export * from "./summary";
