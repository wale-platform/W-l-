import {
  Button,
  Card,
  CardBody,
} from "@/components/ui";

interface PropertyCardProps {
  title: string;
  price: number;
  location: string;
  status: "pending" | "approved" | "rejected";
}

export function PropertyCard({
  title,
  price,
  location,
  status,
}: PropertyCardProps) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">
              {title}
            </h3>

            <p className="mt-1 text-sm text-ink-500">
              {location}
            </p>
          </div>

          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
            {status}
          </span>
        </div>

        <p className="text-lg font-semibold text-ink-900">
          ₦{price.toLocaleString()}
        </p>

        <div className="flex gap-3">
          <Button tone="outline" size="sm">
            Edit
          </Button>

          <Button tone="danger" size="sm">
            Delete
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}