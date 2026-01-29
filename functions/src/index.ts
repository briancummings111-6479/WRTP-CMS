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

import * as admin from "firebase-admin";

admin.initializeApp();

// For cost control...
setGlobalOptions({ maxInstances: 10 });

export * from "./ocr";
export * from "./summary";
export * from "./analysis";
export * from "./query";
export * from "./email";
