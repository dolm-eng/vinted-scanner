import ItemDetail from "@/components/ItemDetail";

export default async function ItemPage(
  props: PageProps<"/item/[id]">
) {
  const { id } = await props.params;
  return <ItemDetail id={id} />;
}
