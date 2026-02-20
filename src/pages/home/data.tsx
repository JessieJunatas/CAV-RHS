import { useNavigate } from "react-router-dom"
import { Button } from "@/components/animate-ui/components/buttons/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DataCardProps {
  id: number
  title: string
  value: string
  description: string
}

export default function DataCard({
  id,
  title,
  value,
  description,
}: DataCardProps) {

  const navigate = useNavigate()

  const handleDelete = () => {
    console.log("Deleting ID:", id)
    // call for API later
  }

  return (
    <Card className="mx-auto w-full max-w-5xl overflow-hidden">
      <div className="flex gap-4 px-5">
        <img
          src="https://avatar.vercel.sh/shadcn9"
          alt={title}
          className="h-50 w-50 flex-shrink-0 rounded-lg object-cover"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <CardHeader className="p-0">
            <CardTitle className="truncate text-base">
              {title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          </CardHeader>

          <div className="text-2xl font-bold">{value}</div>

          <CardFooter className="mt-auto flex items-center justify-between gap-4 p-0">
            <span className="text-sm text-muted-foreground">
              Last modified 0 minutes ago
            </span>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => navigate(`/view/${id}`)}
              >
                View
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/edit/${id}`)}
              >
                Edit
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </CardFooter>
        </div>
      </div>
    </Card>
  )
}
