import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats, adminListLessons, checkAdmin } from "@/lib/admin.functions";
import { BookOpen, GraduationCap, Layers, Sparkles, Users, ListChecks } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Админка — Умничка.AI" }] }),
  component: AdminIndex,
});

function AdminIndex() {
  const fetchStats = useServerFn(adminStats);
  const fetchLessons = useServerFn(adminListLessons);
  const fetchAdmin = useServerFn(checkAdmin);

  const { data: a } = useQuery({ queryKey: ["isAdmin"], queryFn: () => fetchAdmin() });
  const { data: stats } = useQuery({ queryKey: ["adminStats"], queryFn: () => fetchStats(), enabled: !!a?.isAdmin });
  const { data: lessons } = useQuery({ queryKey: ["adminLessons"], queryFn: () => fetchLessons(), enabled: !!a?.isAdmin });

  if (a && !a.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Только для администратора</h1>
        <p className="mt-2 text-muted-foreground">Вернись в кабинет и стань первым админом.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-primary underline">В кабинет</Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Админка</h1>
      <p className="text-muted-foreground">Управление содержимым платформы.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Tile icon={Layers} label="Предметов" value={stats?.subjects} />
        <Tile icon={BookOpen} label="Учебников" value={stats?.books} />
        <Tile icon={GraduationCap} label="Уроков" value={stats?.lessons} />
        <Tile icon={ListChecks} label="Заданий" value={stats?.tasks} />
        <Tile icon={Users} label="Учеников" value={stats?.users} />
        <Tile icon={Sparkles} label="Проверок" value={stats?.submissions} />
      </div>

      <div className="mt-8 glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Все уроки</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2">#</th><th>Предмет</th><th>Название</th></tr>
            </thead>
            <tbody>
              {(lessons ?? []).slice(0, 100).map((l: { id: string; number: number; title: string; subjects: { name: string } | null }) => (
                <tr key={l.id} className="border-t">
                  <td className="py-2">{l.number}</td>
                  <td>{l.subjects?.name ?? "—"}</td>
                  <td>{l.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!lessons || lessons.length === 0) && <p className="py-4 text-muted-foreground">Уроков пока нет.</p>}
        </div>
      </div>
    </section>
  );
}

function Tile({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value?: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="mt-2 text-2xl font-bold">{value ?? "—"}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
