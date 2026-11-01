"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  toast,
} from "@/components/ui";
import { PropertyImagePicker, type PickedImage } from "@/components/property/PropertyImagePicker";
import { propertyApi } from "@/lib/api/property";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/api/schemas";
import { formatPropertyType, todayDateInputValue } from "@/lib/utils/format";

export default function UploadApartmentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [apartmentType, setApartmentType] = useState<PropertyType | "">("");
  const [moveOutDate, setMoveOutDate] = useState(todayDateInputValue);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!address || !price || !apartmentType || !moveOutDate) {
      toast.error("Missing fields", { description: "Please fill in all required fields." });
      return;
    }

    if (images.length === 0) {
      toast.error("Add a photo", { description: "Add at least one photo of the property." });
      return;
    }

    try {
      setIsLoading(true);

      await propertyApi.create({
        title: `Outgoing tenant listing: ${formatPropertyType(apartmentType)} at ${address}`,
        description: `This apartment is becoming vacant soon. The outgoing tenant is moving out on ${moveOutDate}. Ideal for students looking for verified handover.`,
        price: Number(price),
        type: apartmentType,
        bedrooms: 1,
        bathrooms: 1,
        address,
        city: "Ilorin",
        state: "Kwara",
        university: "unilorin",
        availableDate: moveOutDate,
        amenities: ["Prepaid meter", "Water supply"],
      }, images.map((image) => image.file));

      toast.success("Listing submitted", {
        description: "Your outgoing apartment details have been submitted and are pending verification.",
      });
      router.push("/tenant");
    } catch (err) {
      toast.error("Submission failed", {
        description: err instanceof Error ? err.message : "An error occurred while uploading the apartment.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Outgoing Tenant"
            title="Upload Apartment Information"
            lead="Submit the details of the apartment you are moving out of so incoming students can take over."
          />

          <Card>
            <CardHeader>
              <CardTitle>Apartment Information</CardTitle>
            </CardHeader>

            <CardBody>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="address"
                    className="text-sm font-medium text-ink-800"
                  >
                    Apartment Address
                  </label>

                  <input
                    id="address"
                    value={address}
                    onChange={(event) =>
                      setAddress(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                    placeholder="Enter apartment address"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="price"
                    className="text-sm font-medium text-ink-800"
                  >
                    Current Annual Rent (₦)
                  </label>

                  <input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(event) =>
                      setPrice(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                    placeholder="e.g. 250000"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="apartmentType"
                    className="text-sm font-medium text-ink-800"
                  >
                    Apartment Type
                  </label>

                  <select
                    id="apartmentType"
                    value={apartmentType}
                    onChange={(event) =>
                      setApartmentType(event.target.value as PropertyType | "")
                    }
                    className="h-11 rounded-field border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-600"
                  >
                    <option value="" disabled>Select type</option>
                    {PROPERTY_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="moveOutDate"
                    className="text-sm font-medium text-ink-800"
                  >
                    Expected Move-out Date
                  </label>

                  <input
                    id="moveOutDate"
                    type="date"
                    value={moveOutDate}
                    onChange={(event) =>
                      setMoveOutDate(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-ink-800">Photos</p>
                  <PropertyImagePicker images={images} onChange={setImages} disabled={isLoading} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    tone="outline"
                    type="button"
                    onClick={() => router.push("/tenant")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isLoading} loadingText="Submitting...">
                    Submit Apartment
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}