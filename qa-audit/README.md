# VoxCode QA Audit Directory

This directory contains automated audit scripts, test suites, and scratch reports generated during the ruthless production-readiness audit.

Per Hard Rule 1: Application source files (`backend/src` and `frontend/src`) are untouched.
Per Hard Rule 2: All audit tests run against an isolated local throwaway MongoDB database on `mongodb://127.0.0.1:27017` and never contact external hosts or Atlas.
