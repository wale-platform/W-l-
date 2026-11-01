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

export default function LawyerUploadPropertyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [propertyName, setPropertyName] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!propertyName || !landlordName || !price || !location) {
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
        title: propertyName,
        description: `Verified listing submitted on behalf of the property owner ${landlordName} by their legal representative.`,
        price: Number(price),
        type: "flat",
        bedrooms: 2,
        bathrooms: 2,
        address: location,
        city: "Ilorin",
        state: "Kwara",
        university: "unilorin",
        availableDate: new Date().toISOString().split("T")[0],
        amenities: ["Prepaid meter", "Water borehole", "Gated compound"],
        contactName: landlordName,
      }, images.map((image) => image.file));

      toast.success("Listing submitted", {
        description: "The property listing has been submitted successfully and is pending review.",
      });
      router.push("/lawyer");
    } catch (err: any) {
      toast.error("Submission failed", {
        description: err.message || "An error occurred while uploading the property.",
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
            eyebrow="Lawyer"
            title="Upload Property"
            lead="Submit a property on behalf of a landlord."
          />

          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>

            <CardBody>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="propertyName"
                    className="text-sm font-medium text-ink-800"
                  >
                    Property Name
                  </label>

                  <input
                    id="propertyName"
                    value={propertyName}
                    onChange={(event) =>
                      setPropertyName(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter property name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="landlordName"
                    className="text-sm font-medium text-ink-800"
                  >
                    Landlord Name
                  </label>

                  <input
                    id="landlordName"
                    value={landlordName}
                    onChange={(event) =>
                      setLandlordName(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter landlord name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="price"
                    className="text-sm font-medium text-ink-800"
                  >
                    Price
                  </label>

                  <input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter price"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="location"
                    className="text-sm font-medium text-ink-800"
                  >
                    Location
                  </label>

                  <input
                    id="location"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm"
                    placeholder="Enter location"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-ink-800">Photos</p>
                  <PropertyImagePicker images={images} onChange={setImages} disabled={isLoading} />
                </div>

                <Button type="submit" isLoading={isLoading} loadingText="Submitting...">
                  Submit Property
                </Button>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </main>
  );
}