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
import { propertyApi } from "@/lib/api/property";

export default function UploadPropertyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [university, setUniversity] = useState("");
  const [availableDate, setAvailableDate] = useState("");
  const [amenities, setAmenities] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !title ||
      !description ||
      !price ||
      !type ||
      !bedrooms ||
      !bathrooms ||
      !address ||
      !city ||
      !state ||
      !availableDate
    ) {
      toast.error("Missing fields", { description: "Please fill in all required fields." });
      return;
    }

    try {
      setIsLoading(true);

      await propertyApi.create({
        title,
        description,
        price: Number(price),
        type: type as any,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        address,
        city,
        state,
        university: university || undefined,
        availableDate,
        images: [
          "/listings/listing-01.jpg",
          "/listings/listing-02.jpg",
        ],
        amenities: amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        source: "landlord",
        landlord: {
          name: "Alhaji Kolawole",
          phone: "+2348039998887",
        },
      });

      toast.success("Listing submitted", {
        description: "Your property listing has been submitted and is pending verification.",
      });
      router.push("/landlord");
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
        <Container
          size="narrow"
          className="flex flex-col gap-8"
        >
          <SectionHeading
            eyebrow="Properties"
            title="Upload a property"
            lead="Add the details of your property so students can find it on WALE."
          />

          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>

            <CardBody>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-6"
              >
                {/* Property Title */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="title"
                    className="text-sm font-medium text-ink-800"
                  >
                    Property Title
                  </label>

                  <input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g. Spacious 2 Bedroom Flat"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium text-ink-800"
                  >
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    rows={5}
                    placeholder="Describe the property..."
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    className="rounded-field border border-ink-200 p-4 text-sm outline-none focus:border-brand-600"
                  />
                </div>

                {/* Price and Type */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="price"
                      className="text-sm font-medium text-ink-800"
                    >
                      Rent
                    </label>

                    <input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="e.g. 500000"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="type"
                      className="text-sm font-medium text-ink-800"
                    >
                      Apartment Type
                    </label>

                    <select
                      id="type"
                      name="type"
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                      className="h-11 rounded-field border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-600"
                    >
                      <option value="">Select type</option>
                      <option value="studio">Studio</option>
                      <option value="one_bedroom">1 Bedroom</option>
                      <option value="two_bedroom">2 Bedroom</option>
                      <option value="shared">Shared</option>
                    </select>
                  </div>
                </div>

                {/* Bedrooms and Bathrooms */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="bedrooms"
                      className="text-sm font-medium text-ink-800"
                    >
                      Number of Bedrooms
                    </label>

                    <input
                      id="bedrooms"
                      name="bedrooms"
                      type="number"
                      min="0"
                      placeholder="e.g. 2"
                      value={bedrooms}
                      onChange={(event) =>
                        setBedrooms(event.target.value)
                      }
                      className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="bathrooms"
                      className="text-sm font-medium text-ink-800"
                    >
                      Number of Bathrooms
                    </label>

                    <input
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      min="1"
                      placeholder="e.g. 2"
                      value={bathrooms}
                      onChange={(event) =>
                        setBathrooms(event.target.value)
                      }
                      className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="address"
                    className="text-sm font-medium text-ink-800"
                  >
                    Full Address
                  </label>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="e.g. 12 University Road"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                  />
                </div>

                {/* City and State */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="city"
                      className="text-sm font-medium text-ink-800"
                    >
                      City
                    </label>

                    <input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="e.g. Ilorin"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="state"
                      className="text-sm font-medium text-ink-800"
                    >
                      State
                    </label>

                    <input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="e.g. Kwara"
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                    />
                  </div>
                </div>

                {/* University */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="university"
                    className="text-sm font-medium text-ink-800"
                  >
                    Nearby University
                  </label>

                  <input
                    id="university"
                    name="university"
                    type="text"
                    placeholder="e.g. University of Ilorin"
                    value={university}
                    onChange={(event) =>
                      setUniversity(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                  />
                </div>

                {/* Available Date */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="availableDate"
                    className="text-sm font-medium text-ink-800"
                  >
                    Available Date
                  </label>

                  <input
                    id="availableDate"
                    name="availableDate"
                    type="date"
                    value={availableDate}
                    onChange={(event) =>
                      setAvailableDate(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                  />
                </div>

                {/* Amenities */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="amenities"
                    className="text-sm font-medium text-ink-800"
                  >
                    Amenities
                  </label>

                  <input
                    id="amenities"
                    name="amenities"
                    type="text"
                    placeholder="e.g. Water, Parking, Security"
                    value={amenities}
                    onChange={(event) =>
                      setAmenities(event.target.value)
                    }
                    className="h-11 rounded-field border border-ink-200 px-4 text-sm outline-none focus:border-brand-600"
                  />

                  <p className="text-xs text-ink-500">
                    Separate amenities with commas.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                  <Button
                    tone="outline"
                    type="button"
                    onClick={() => router.push("/landlord")}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" isLoading={isLoading} loadingText="Submitting...">
                    Submit Property
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
