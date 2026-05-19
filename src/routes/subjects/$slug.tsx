import { createFileRoute, Link, Outlet, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSubjectWithContent } from "@/lib/catalog.functions";

export const Route = createFileRoute("/subjects/$slug")({
  loader: async ({ params }) => {
    const data = await getSubjectWithContent({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  component: () => <Outlet />,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Предмет не найден</h1>
        <Link to="/subjects" className="mt-4 inline-block text-primary underline">К каталогу</Link>
      </div>
    </SiteLayout>
  ),
});
