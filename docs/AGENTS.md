# AGENTS.md

This project is a school timetable generator.

## Core Rules

* Do not rewrite the entire application unless absolutely necessary.
* Focus changes primarily in apps/api/src/routes.ts.
* Preserve all existing working features.

## Scheduling Behavior

* A valid timetable is not enough; optimize for quality and balance.
* Subjects must be distributed evenly across the week.
* Do not schedule the same subject every day unless required by weekly load.

## Daily Rules

* Default: only 1 occurrence per subject per day.
* Exception: allow 2 only if it is a consecutive double period.

## Double Period Definition

* Two consecutive time slots
* Same subject, teacher, class, and room
* Must be scheduled back-to-back on the same day

## Scheduling Logic Requirements

* Do not use first-fit placement.
* Generate multiple valid candidates and choose the best one.
* Use a scoring/penalty system:

  * penalize same subject on consecutive days
  * penalize multiple same-subject entries in one day unless it is a double period
  * penalize uneven weekly distribution
* Prefer evenly spaced schedules such as Mon-Wed-Fri.

## Rendering / PDF Rules

* Output must be a compact weekly timetable grid.
* Monday to Friday are columns.
* Time slots are rows.

## Cell Content

* Subject name or code
* Teacher name
* Room only if different from fixed room

## Do Not Include

* "Class Period"
* repeated fixed room text in every cell

## Merge Logic

* Consecutive identical assignments must be merged into one block.
* Merge only if:

  * same subject
  * same teacher
  * same class
  * same room
  * consecutive periods

## Implementation Behavior

* Apply incremental changes only.
* Avoid unnecessary refactoring.
* After changes, always explain:

  * what functions were modified
  * what logic was added
  * what behavior changed
