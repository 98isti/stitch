interface Props { title: string }
export default function PlaceholderPage({ title }: Props) {
  return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-3">🚧</div>
        <p className="font-medium text-gray-600">{title}</p>
        <p className="text-sm mt-1">Coming soon</p>
      </div>
    </div>
  )
}
