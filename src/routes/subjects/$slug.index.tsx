import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSubjectTheme } from "@/lib/subject-theme";
import { BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/subjects/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `Предмет ${params.slug} — Умничка.AI` },
      { name: "description", content: `Учебники, уроки и задания по предмету ${params.slug} для 3 класса.` },
    ],
  }),
  component: SubjectPage,
});

function SubjectPage() {
  // Use parent route loader data
  const { subject, books, lessons } = Route.useRouteContext as never as never;
  // The above is a placeholder — fetch from parent via useLoaderData on parent route
  return <SubjectPageInner />;
}

function SubjectPageInner() {
  const parent = (Route as any).useParentMatches?.() ?? [];
  // Simpler: re-read parent loader data
  return <SubjectPageImpl />;
}

function SubjectPageImpl() {
  const data = (require("@tanstack/react-router") as any);
  return null;
}
