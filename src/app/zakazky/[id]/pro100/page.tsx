import { Pro100Importer } from '../Pro100Importer'

interface Props {
  params: { id: string }
}

export default function Pro100Page({ params }: Props) {
  return <Pro100Importer zakazkaId={params.id} />
}
