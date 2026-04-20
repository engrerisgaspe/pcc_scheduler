import { Router } from "express";
import type { Room, Section, Subject, Teacher } from "@school-scheduler/shared";
import { createId } from "./helpers.js";

type CollectionItem = Teacher | Subject | Section | Room;

interface ResourceConfig<T extends CollectionItem> {
  collection: T[];
  idPrefix: string;
}

export function createResourceRouter<T extends CollectionItem>({
  collection,
  idPrefix
}: ResourceConfig<T>) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json(collection);
  });

  router.get("/:id", (request, response) => {
    const item = collection.find((entry) => entry.id === request.params.id);

    if (!item) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    response.json(item);
  });

  router.post("/", (request, response) => {
    const nextItem = {
      ...request.body,
      id: createId(idPrefix)
    } as T;

    collection.push(nextItem);
    response.status(201).json(nextItem);
  });

  router.put("/:id", (request, response) => {
    const index = collection.findIndex((entry) => entry.id === request.params.id);

    if (index === -1) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const updatedItem = {
      ...collection[index],
      ...request.body,
      id: collection[index].id
    } as T;

    collection[index] = updatedItem;
    response.json(updatedItem);
  });

  router.delete("/:id", (request, response) => {
    const index = collection.findIndex((entry) => entry.id === request.params.id);

    if (index === -1) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const deleted = collection.splice(index, 1)[0];
    response.json(deleted);
  });

  return router;
}
