"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, newId, type Task, type TaskPriority } from "@/lib/db";
import { formatDateFR, todayISO } from "@/lib/dates";
import { Chip, Field, PageTitle, TextInput } from "@/components/ui";

const PRIORITIES: { value: TaskPriority; label: string; dot: string }[] = [
  { value: "haute", label: "Haute", dot: "bg-chalk-red" },
  { value: "normale", label: "Normale", dot: "bg-brass" },
  { value: "basse", label: "Basse", dot: "bg-ink/30" },
];

const RANK: Record<TaskPriority, number> = { haute: 0, normale: 1, basse: 2 };

export default function TachesPage() {
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normale");

  const today = todayISO();
  const todo = (tasks ?? []).filter((t) => !t.done);
  const done = (tasks ?? []).filter((t) => t.done);
  const sort = (a: Task, b: Task) =>
    RANK[a.priority] - RANK[b.priority] || a.createdAt - b.createdAt;

  const groups = [
    { name: "En retard", list: todo.filter((t) => t.dueDate && t.dueDate < today).sort(sort), late: true },
    { name: "Aujourd'hui", list: todo.filter((t) => t.dueDate === today).sort(sort) },
    { name: "À venir", list: todo.filter((t) => t.dueDate && t.dueDate > today).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)) },
    { name: "Sans date", list: todo.filter((t) => !t.dueDate).sort(sort) },
  ];

  async function add() {
    const t = title.trim();
    if (!t) return;
    await db.tasks.add({
      id: newId(),
      title: t,
      dueDate: dueDate || null,
      priority,
      done: false,
      createdAt: Date.now(),
    });
    setTitle("");
    setDueDate("");
    setPriority("normale");
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <PageTitle>Tâches</PageTitle>

      <div className="mt-4 flex flex-col gap-3 rounded-sm border border-line px-4 py-4">
        <Field label="Nouvelle tâche">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Ex. Photographier le lot de pulls"
            className="w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base outline-none focus:border-ink"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Échéance">
            <TextInput type="date" value={dueDate} onCommit={setDueDate} />
          </Field>
          <Field label="Priorité">
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <Chip key={p.value} small active={priority === p.value} onClick={() => setPriority(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!title.trim()}
          className="rounded-sm bg-chalk-red py-3 font-display text-base font-bold text-paper disabled:opacity-50"
        >
          Ajouter la tâche
        </button>
      </div>

      {tasks && todo.length === 0 && (
        <p className="mt-6 rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-ink/60">
          Rien à faire pour l&apos;instant.
        </p>
      )}

      {groups
        .filter((g) => g.list.length > 0)
        .map((g) => (
          <section key={g.name} className="mt-6">
            <h2 className={`font-display text-base font-bold ${g.late ? "text-chalk-red" : ""}`}>
              {g.name} · {g.list.length}
            </h2>
            <ul className="mt-2 flex flex-col divide-y divide-line border-y border-line">
              {g.list.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </section>
        ))}

      {done.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-base font-bold text-ink/60">
            Terminées · {done.length}
          </h2>
          <ul className="mt-2 flex flex-col divide-y divide-line border-y border-line">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function TaskRow({ task }: { task: Task }) {
  const pr = PRIORITIES.find((p) => p.value === task.priority)!;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? "Marquer comme à faire" : "Marquer comme faite"}
        onClick={() => db.tasks.update(task.id, { done: !task.done })}
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-sm border text-sm ${
          task.done ? "border-sage bg-sage text-paper" : "border-ink/40"
        }`}
      >
        {task.done ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${task.done ? "text-ink/45 line-through" : ""}`}>
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink/50">
          <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
          {pr.label}
          {task.dueDate && ` · ${formatDateFR(task.dueDate)}`}
        </p>
      </div>
      <button
        type="button"
        aria-label="Supprimer la tâche"
        onClick={() => db.tasks.delete(task.id)}
        className="flex-none px-1 text-ink/40"
      >
        ×
      </button>
    </li>
  );
}
