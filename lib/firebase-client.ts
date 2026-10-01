"use client";

import { getApps, initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import { firebaseWebConfig } from "@/lib/firebase-config";

export function getMelearnFirebaseAuth() {
  const name = "melearn-google-auth";
  const app = getApps().find((item) => item.name === name) ?? initializeApp(firebaseWebConfig, name);
  return getAuth(app);
}
