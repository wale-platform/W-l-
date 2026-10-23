"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  LayerGroup,
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker,
  Popup,
} from "leaflet";
import { z } from "zod";
import { propertyListResponseSchema, type Property } from "@/lib/api/schemas";
import { formatRent } from "@/lib/utils/format";

const routeResponseSchema = z.object({
  code: z.string(),
  routes: z.array(
    z.object({
      distance: z.number().nonnegative(),
      duration: z.number().nonnegative(),
      geometry: z.object({
        coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
      }),
      legs: z.array(
        z.object({
          steps: z.array(
            z.object({
              distance: z.number().nonnegative(),
              name: z.string().nullish(),
              maneuver: z.object({
                type: z.string(),
                modifier: z.string().nullish(),
              }),
            }),
          ),
        }),
      ),
    }),
  ),
});

const routeCoordinateSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);

const navigationSnapshotSchema = z.object({
  version: z.literal(1),
  destinationTitle: z.string().min(1),
  destinationCoordinates: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }),
  origin: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    accuracy: z.number().finite().nonnegative(),
  }),
  distance: z.number().finite().nonnegative(),
  duration: z.number().finite().nonnegative(),
  routeCoordinates: z.array(routeCoordinateSchema).min(2),
  steps: z.array(
    z.object({
      instruction: z.string(),
      distance: z.number().finite().nonnegative(),
    }),
  ),
});

type NavigationSnapshot = z.infer<typeof navigationSnapshotSchema>;

const navigationStorageKey = "wale-map-navigation-v1";

type MapListing = Pick<
  Property,
  | "id"
  | "title"
  | "price"
  | "address"
  | "city"
  | "coordinates"
  | "images"
  | "availabilityStatus"
  | "featured"
>;

type ListingStatus = "available" | "limited" | "occupied" | "featured";

const listingStatusLabels: Record<ListingStatus, string> = {
  available: "Available",
  limited: "Limited / Soon",
  occupied: "Occupied",
  featured: "Featured",
};

type SearchPoint = {
  lat: number;
  lng: number;
  label: string;
};

type NavigationState =
  | { status: "idle" }
  | {
      status: "locating" | "routing";
      destinationTitle: string;
    }
  | {
      status: "ready";
      destinationTitle: string;
      distance: number;
      duration: number;
      locationAccuracy: number;
      steps: Array<{ instruction: string; distance: number }>;
    }
  | {
      status: "error";
      destinationTitle: string;
      message: string;
    };

function distanceInKm(
  first: { lat: number; lng: number },
  second: { lat: number; lng: number },
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.lat - first.lat);
  const longitudeDelta = radians(second.lng - first.lng);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.lat)) *
      Math.cos(radians(second.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }
  return "We couldn't find that postcode or location. Try a nearby area or city.";
}

function getListingStatus(property: MapListing): ListingStatus {
  if (property.featured) return "featured";
  return property.availabilityStatus ?? "available";
}

function getNavigationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Allow location access in your browser to get directions.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location couldn't be determined. Check your device location settings and try again.";
  }
  return "Finding your location timed out. Please try again.";
}

function getManeuverInstruction(step: {
  maneuver: { type: string; modifier?: string | null };
  name?: string | null;
}) {
  const road = step.name?.trim();
  const modifier = step.maneuver.modifier;
  const instruction =
    step.maneuver.type === "arrive"
      ? "Arrive at your destination"
      : step.maneuver.type === "depart"
        ? "Start"
        : step.maneuver.type === "turn" ||
            step.maneuver.type === "end of road" ||
            step.maneuver.type === "fork"
          ? `${step.maneuver.type === "fork" ? "Keep" : "Turn"}${modifier ? ` ${modifier}` : ""}`
          : step.maneuver.type === "roundabout" ||
              step.maneuver.type === "rotary"
            ? "Enter the roundabout"
            : step.maneuver.type === "exit roundabout" ||
                step.maneuver.type === "exit rotary"
              ? "Exit the roundabout"
              : step.maneuver.type === "merge"
                ? "Merge"
                : step.maneuver.type === "on ramp"
                  ? "Take the ramp"
                  : step.maneuver.type === "off ramp"
                    ? "Take the exit"
                    : "Continue";

  if (step.maneuver.type === "arrive") return instruction;
  if (step.maneuver.type === "depart") return road ? `${instruction} on ${road}` : instruction;
  return road ? `${instruction} onto ${road}` : instruction;
}

function formatRouteDistance(meters: number) {
  return meters < 1_000
    ? `${Math.round(meters)} m`
    : `${(meters / 1_000).toFixed(1)} km`;
}

function formatRouteDuration(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

export function MapSearch({ initialLocation = "" }: { initialLocation?: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const propertyMarkers = useRef<LayerGroup | null>(null);
  const navigationLayers = useRef<LayerGroup | null>(null);
  const navigationRequestId = useRef(0);
  const routeRequest = useRef<AbortController | null>(null);
  const propertyMarkersById = useRef(
    new Map<
      string,
      { marker: Marker; popup: Popup; openPopup: () => void; closePopup: () => void }
    >(),
  );
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const lastInitialLocation = useRef<string | null>(null);
  const [location, setLocation] = useState(initialLocation);
  const [searchPoint, setSearchPoint] = useState<SearchPoint | null>(null);
  const [properties, setProperties] = useState<MapListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");
  const [propertiesError, setPropertiesError] = useState("");
  const [restoredNavigation, setRestoredNavigation] =
    useState<NavigationSnapshot | null>(null);
  const [navigationStorageError, setNavigationStorageError] = useState("");
  const [navigation, setNavigation] = useState<NavigationState>({
    status: "idle",
  });

  useEffect(() => {
    let cancelled = false;

    async function restoreNavigation() {
      let snapshot: NavigationSnapshot | null = null;
      let errorMessage = "";
      try {
        const savedRoute = localStorage.getItem(navigationStorageKey);
        if (!savedRoute) return;

        const parsed = navigationSnapshotSchema.safeParse(
          JSON.parse(savedRoute),
        );
        if (!parsed.success) {
          try {
            localStorage.removeItem(navigationStorageKey);
          } catch (cause) {
            console.error(
              "WALE could not clear invalid saved directions",
              cause,
            );
          }
          errorMessage =
            "Saved directions were invalid. Please request a new route.";
        } else {
          snapshot = parsed.data;
        }
      } catch (cause) {
        console.error("WALE saved directions could not be restored", cause);
        errorMessage =
          "Saved directions couldn't be restored. You can request a new route.";
      }

      await Promise.resolve();
      if (cancelled) return;

      if (errorMessage) {
        setNavigationStorageError(errorMessage);
      }
      if (snapshot) {
        setRestoredNavigation(snapshot);
        setNavigation({
          status: "ready",
          destinationTitle: snapshot.destinationTitle,
          distance: snapshot.distance,
          duration: snapshot.duration,
          locationAccuracy: snapshot.origin.accuracy,
          steps: snapshot.steps,
        });
      }
    }

    void restoreNavigation();
    return () => {
      cancelled = true;
    };
  }, []);

  const findLocation = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError("Enter a postcode, postal code, neighbourhood, or city.");
      return;
    }

    setIsSearching(true);
    setError("");
    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(trimmedQuery)}`,
      );
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload));

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("location" in payload) ||
        typeof payload.location !== "object" ||
        payload.location === null ||
        !("lat" in payload.location) ||
        typeof payload.location.lat !== "number" ||
        !("lng" in payload.location) ||
        typeof payload.location.lng !== "number" ||
        !("label" in payload.location) ||
        typeof payload.location.label !== "string"
      ) {
        throw new Error("Location search returned an invalid response.");
      }

      setSearchPoint({
        lat: payload.location.lat,
        lng: payload.location.lng,
        label: payload.location.label,
      });
    } catch (cause) {
      setSearchPoint(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Location search failed. Please try again.",
      );
    } finally {
      setIsSearching(false);
    }
  }, []);

  const startNavigation = useCallback(
    (destination: MapListing) => {
      const L = leaflet.current;
      const map = mapInstance.current;
      const layers = navigationLayers.current;
      const destinationCoordinates = destination.coordinates;
      const requestId = ++navigationRequestId.current;
      routeRequest.current?.abort();
      setRestoredNavigation(null);
      setNavigationStorageError("");
      try {
        localStorage.removeItem(navigationStorageKey);
      } catch (cause) {
        console.error("WALE could not clear previously saved directions", cause);
        setNavigationStorageError(
          "Previous directions couldn't be cleared from this browser.",
        );
      }

      if (!L || !map || !layers || !destinationCoordinates) {
        setNavigation({
          status: "error",
          destinationTitle: destination.title,
          message: "The map isn't ready for directions yet. Please try again.",
        });
        return;
      }
      if (!navigator.geolocation) {
        setNavigation({
          status: "error",
          destinationTitle: destination.title,
          message: "Location access isn't available in this browser.",
        });
        return;
      }

      layers.clearLayers();
      map.closePopup();
      setNavigation({ status: "locating", destinationTitle: destination.title });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (requestId !== navigationRequestId.current) return;

          setNavigation({ status: "routing", destinationTitle: destination.title });
          const controller = new AbortController();
          routeRequest.current = controller;
          const { latitude, longitude } = position.coords;
          const { lat, lng } = destinationCoordinates;
          const routeUrl = new URL(
            `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${lng},${lat}`,
          );
          routeUrl.searchParams.set("overview", "full");
          routeUrl.searchParams.set("geometries", "geojson");
          routeUrl.searchParams.set("steps", "true");

          void (async () => {
            try {
              const response = await fetch(routeUrl, {
                signal: controller.signal,
              });
              if (!response.ok) {
                throw new Error("The route service is unavailable. Please try again.");
              }

              const parsed = routeResponseSchema.safeParse(await response.json());
              if (!parsed.success) {
                throw new Error("The route service returned invalid directions.");
              }
              if (parsed.data.code !== "Ok" || !parsed.data.routes[0]) {
                throw new Error("No driving route was found to this home.");
              }

              const route = parsed.data.routes[0];
              const snapshot: NavigationSnapshot = {
                version: 1,
                destinationTitle: destination.title,
                destinationCoordinates,
                origin: {
                  lat: latitude,
                  lng: longitude,
                  accuracy: position.coords.accuracy,
                },
                distance: route.distance,
                duration: route.duration,
                routeCoordinates: route.geometry.coordinates,
                steps: route.legs.flatMap((leg) =>
                  leg.steps.map((step) => ({
                    instruction: getManeuverInstruction(step),
                    distance: step.distance,
                  })),
                ),
              };

              setRestoredNavigation(snapshot);
              setNavigation({
                status: "ready",
                destinationTitle: snapshot.destinationTitle,
                distance: snapshot.distance,
                duration: snapshot.duration,
                locationAccuracy: snapshot.origin.accuracy,
                steps: snapshot.steps,
              });
              try {
                localStorage.setItem(
                  navigationStorageKey,
                  JSON.stringify(snapshot),
                );
                setNavigationStorageError("");
              } catch (cause) {
                console.error("WALE directions could not be saved", cause);
                setNavigationStorageError(
                  "Directions are ready, but this browser couldn't save them for your next visit.",
                );
              }
            } catch (cause) {
              if (controller.signal.aborted) return;
              setNavigation({
                status: "error",
                destinationTitle: destination.title,
                message:
                  cause instanceof Error
                    ? cause.message
                    : "We couldn't get directions. Please try again.",
              });
            }
          })();
        },
        (cause) => {
          if (requestId !== navigationRequestId.current) return;
          setNavigation({
            status: "error",
            destinationTitle: destination.title,
            message: getNavigationErrorMessage(cause),
          });
        },
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
      );
    },
    [],
  );

  const clearNavigation = useCallback(() => {
    navigationRequestId.current += 1;
    routeRequest.current?.abort();
    routeRequest.current = null;
    navigationLayers.current?.clearLayers();
    setRestoredNavigation(null);
    setNavigation({ status: "idle" });
    setNavigationStorageError("");
    try {
      localStorage.removeItem(navigationStorageKey);
    } catch (cause) {
      console.error("WALE could not clear saved directions", cause);
      setNavigationStorageError(
        "Directions were cleared from the map but couldn't be removed from this browser.",
      );
    }
  }, []);

  useEffect(() => {
    if (
      !initialLocation.trim() ||
      lastInitialLocation.current === initialLocation
    ) {
      return;
    }

    lastInitialLocation.current = initialLocation;
    setLocation(initialLocation);
    void findLocation(initialLocation);
  }, [findLocation, initialLocation]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProperties() {
      try {
        const response = await fetch("/api/properties?page=1&pageSize=50", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("We couldn't load property locations. Please refresh.");
        }

        const data = propertyListResponseSchema.parse(await response.json());
        setProperties(
          data.properties
            .filter(
              (property): property is Property & { coordinates: NonNullable<Property["coordinates"]> } =>
                property.coordinates !== undefined,
            )
            .map(
              ({
                id,
                title,
                price,
                address,
                city,
                coordinates,
                images,
                availabilityStatus,
                featured,
              }) => ({
                id,
                title,
                price,
                address,
                city,
                coordinates,
                images,
                availabilityStatus,
                featured,
              }),
            ),
        );
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setPropertiesError(
          cause instanceof Error
            ? cause.message
            : "We couldn't load property locations. Please refresh.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingProperties(false);
      }
    }

    void loadProperties();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const node = mapContainer.current;
    if (!node) return;

    let disposed = false;
    let map: LeafletMap | undefined;
    const markersById = propertyMarkersById.current;

    async function initializeMap() {
      try {
        const L = await import("leaflet");
        if (disposed) return;

        const mapElement = mapContainer.current;
        if (!mapElement) return;

        leaflet.current = L;
        map = L.map(mapElement, { scrollWheelZoom: false }).setView(
          [9.1, 8.6753],
          6,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        propertyMarkers.current = L.layerGroup().addTo(map);
        navigationLayers.current = L.layerGroup().addTo(map);
        mapInstance.current = map;
        setMapReady(true);
      } catch (cause) {
        console.error("WALE map failed to initialize", cause);
        setMapError("The interactive map couldn't be loaded. Please refresh.");
      }
    }

    void initializeMap();
    return () => {
      disposed = true;
      propertyMarkers.current = null;
      navigationLayers.current = null;
      navigationRequestId.current += 1;
      routeRequest.current?.abort();
      routeRequest.current = null;
      markersById.clear();
      mapInstance.current = null;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    const L = leaflet.current;
    const map = mapInstance.current;
    const markers = propertyMarkers.current;
    if (!mapReady || !L || !map || !markers) return;

    markers.clearLayers();
    propertyMarkersById.current.clear();
    if (searchPoint) {
      map.setView([searchPoint.lat, searchPoint.lng], 13);
      const searchIcon = L.divIcon({
        className: "",
        html: '<span class="wale-map-pin wale-map-search-pin"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 22],
      });
      const searchPopup = document.createElement("span");
      searchPopup.textContent = searchPoint.label;
      L.marker([searchPoint.lat, searchPoint.lng], {
        icon: searchIcon,
        title: "Searched location",
        alt: "Searched location",
      })
        .bindPopup(searchPopup)
        .addTo(markers);
    } else {
      map.setView([9.1, 8.6753], 6);
    }

    for (const property of properties) {
      if (!property.coordinates) continue;
      if (
        searchPoint &&
        distanceInKm(searchPoint, property.coordinates) > 25
      ) {
        continue;
      }

      const propertyIcon = L.divIcon({
        className: "",
        html: `<span class="wale-map-pin wale-map-pin--${getListingStatus(property)}"></span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 18],
      });
      const status = getListingStatus(property);
      const popup = document.createElement("div");
      popup.className = "wale-map-popup-card";
      const propertyLink = document.createElement("a");
      propertyLink.href = `/properties/${encodeURIComponent(property.id)}`;
      propertyLink.className = "wale-map-popup-details-link";
      propertyLink.setAttribute("aria-label", `View ${property.title}`);
      if (property.images[0]) {
        const image = document.createElement("img");
        image.src = property.images[0];
        image.alt = property.title;
        image.loading = "lazy";
        image.className = "wale-map-popup-image";
        propertyLink.append(image);
      }
      const content = document.createElement("div");
      content.className = "wale-map-popup-content";
      const statusBadge = document.createElement("span");
      statusBadge.className = `wale-map-popup-status wale-map-popup-status--${status}`;
      statusBadge.textContent = listingStatusLabels[status];
      const title = document.createElement("span");
      title.className = "wale-map-popup-title";
      title.textContent = property.title;
      const details = document.createElement("p");
      details.className = "wale-map-popup-details";
      details.textContent = `${property.address}, ${property.city} · ${formatRent(property.price)}`;
      const price = document.createElement("span");
      price.className = "wale-map-popup-price";
      price.textContent = formatRent(property.price);
      content.append(statusBadge, title, details, price);
      propertyLink.append(content);
      const directions = document.createElement("button");
      directions.type = "button";
      directions.className = "wale-map-popup-directions";
      directions.setAttribute("aria-label", `Take me to ${property.title}`);
      directions.textContent = "Take me there";
      directions.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        startNavigation(property);
      });
      popup.append(propertyLink, directions);

      const marker = L.marker([property.coordinates.lat, property.coordinates.lng], {
        icon: propertyIcon,
        title: property.title,
        alt: property.title,
      }).addTo(markers);
      const propertyPopup = L.popup({
        closeButton: false,
        maxWidth: 190,
        minWidth: 170,
        autoPan: false,
        className: "wale-map-property-popup",
      }).setContent(popup);
      let closePopupTimer: ReturnType<typeof setTimeout> | undefined;
      const openPropertyPopup = () => {
        if (closePopupTimer) clearTimeout(closePopupTimer);
        propertyPopup.setLatLng(marker.getLatLng()).openOn(map);
        const popupElement = propertyPopup.getElement();
        if (!popupElement) return;

        const markerPoint = map.latLngToContainerPoint(marker.getLatLng());
        const popupHeight = popupElement.offsetHeight;
        const mapHeight = map.getSize().y;
        const spaceAbove = markerPoint.y;
        const spaceBelow = mapHeight - markerPoint.y;
        const fitsAbove = spaceAbove >= popupHeight + 12;
        const fitsBelow = spaceBelow >= popupHeight + 12;
        const placeBelow =
          !fitsAbove && (fitsBelow || spaceBelow > spaceAbove);

        popupElement.classList.toggle(
          "wale-map-property-popup--below",
          placeBelow,
        );
        propertyPopup.options.offset = L.point(
          0,
          placeBelow ? popupHeight + 12 : 7,
        );
        propertyPopup.update();
      };
      const closePropertyPopup = () => map.closePopup(propertyPopup);
      const schedulePopupClose = (event: LeafletMouseEvent) => {
        if (closePopupTimer) clearTimeout(closePopupTimer);
        closePopupTimer = setTimeout(() => {
          const popupElement = propertyPopup.getElement();
          const pointerTarget = document.elementFromPoint(
            event.originalEvent.clientX,
            event.originalEvent.clientY,
          );
          if (popupElement?.contains(pointerTarget)) return;
          map.closePopup(propertyPopup);
        }, 300);
      };
      marker.on("mouseover", openPropertyPopup);
      marker.on("mouseout", schedulePopupClose);
      if (window.matchMedia("(hover: none)").matches) {
        marker.on("click", openPropertyPopup);
      }
      propertyPopup.on("mouseover", () => {
        if (closePopupTimer) clearTimeout(closePopupTimer);
      });
      propertyPopup.on("mouseout", schedulePopupClose);
      propertyMarkersById.current.set(property.id, {
        marker,
        popup: propertyPopup,
        openPopup: openPropertyPopup,
        closePopup: closePropertyPopup,
      });
    }
  }, [mapReady, properties, searchPoint, startNavigation]);

  useEffect(() => {
    const L = leaflet.current;
    const map = mapInstance.current;
    const layers = navigationLayers.current;
    if (!mapReady || !L || !map || !layers) return;

    layers.clearLayers();
    if (!restoredNavigation) return;

    const routeLine = L.polyline(
      restoredNavigation.routeCoordinates.map(([longitude, latitude]) =>
        L.latLng(latitude, longitude),
      ),
      {
        color: "#7a1737",
        weight: 6,
        opacity: 0.85,
      },
    ).addTo(layers);
    L.circle(
      [restoredNavigation.origin.lat, restoredNavigation.origin.lng],
      {
        radius: restoredNavigation.origin.accuracy,
        color: "#175cd3",
        weight: 1,
        fillColor: "#175cd3",
        fillOpacity: 0.12,
      },
    ).addTo(layers);
    L.circleMarker(
      [restoredNavigation.origin.lat, restoredNavigation.origin.lng],
      {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#175cd3",
        fillOpacity: 1,
      },
    )
      .bindTooltip(
        `Your location (±${Math.round(restoredNavigation.origin.accuracy)} m GPS accuracy)`,
      )
      .addTo(layers);
    map.fitBounds(routeLine.getBounds(), {
      padding: [36, 36],
      maxZoom: 15,
    });
  }, [mapReady, properties, restoredNavigation, searchPoint]);

  const nearbyProperties = useMemo(() => {
    if (!searchPoint) return properties;
    return properties
      .filter(
        (property) =>
          property.coordinates &&
          distanceInKm(searchPoint, property.coordinates) <= 25,
      )
      .sort((a, b) => {
        if (!a.coordinates) return 1;
        if (!b.coordinates) return -1;
        return (
          distanceInKm(searchPoint, a.coordinates) -
          distanceInKm(searchPoint, b.coordinates)
        );
      });
  }, [properties, searchPoint]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void findLocation(location);
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Find a home on the map.
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-600">
          Search by postcode, neighbourhood, or city to see nearby homes.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search homes by postcode or location"
        className="mx-auto mt-4 flex max-w-3xl flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-sm sm:flex-row"
      >
        <label htmlFor="map-location" className="sr-only">
          Postcode, postal code, neighbourhood, or city
        </label>
        <input
          id="map-location"
          type="search"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. 100001, Tanke, Ilorin"
          maxLength={120}
          required
          className="h-10 min-w-0 flex-1 rounded-field border border-ink-200 px-4 text-sm text-ink-900 placeholder:text-ink-400"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="h-10 rounded-field bg-brand-800 px-5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-wait disabled:opacity-70"
        >
          {isSearching ? "Searching…" : "Search map"}
        </button>
      </form>
      <p className="mx-auto mt-1 max-w-3xl text-center text-[11px] text-ink-500">
        Location searches are processed by OpenStreetMap&apos;s Nominatim
        geocoder. Map data © OpenStreetMap contributors.
      </p>
      <div
        role="group"
        aria-label="Map key"
        className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-brand-100 bg-gradient-to-r from-white via-brand-50/40 to-white px-3 py-2 text-xs font-medium text-ink-700 sm:gap-x-6 sm:px-4"
      >
        <span className="sr-only">Map key</span>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-x-7">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="wale-map-key-swatch wale-map-key-swatch--available" />
            Available
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="wale-map-key-swatch wale-map-key-swatch--limited" />
            Limited / Soon
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="wale-map-key-swatch wale-map-key-swatch--occupied" />
            Occupied
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="wale-map-key-swatch wale-map-key-swatch--featured" />
            Featured
          </li>
        </ul>
      </div>
      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-3xl rounded-xl bg-danger-subtle px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {navigationStorageError && (
        <p
          role="status"
          className="mx-auto mt-4 max-w-3xl rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {navigationStorageError}
        </p>
      )}

      {searchPoint && (
        <p role="status" className="mx-auto mt-5 max-w-7xl text-sm text-ink-600">
          Showing homes within 25 km of{" "}
          <span className="font-semibold text-ink-900">{searchPoint.label}</span>.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-ink-100 shadow-card">
          <div
            ref={mapContainer}
            role="application"
            aria-label="Interactive map of WALE homes"
            className="h-[360px] w-full sm:h-[480px] lg:h-[620px]"
          />
          {!mapReady && !mapError && (
            <p
              role="status"
              className="absolute inset-0 flex items-center justify-center bg-ink-50/90 text-sm font-medium text-ink-700"
            >
              Loading interactive map…
            </p>
          )}
          {mapError && (
            <p
              role="alert"
              className="absolute inset-x-4 top-4 rounded-xl bg-white p-4 text-sm text-danger shadow-card"
            >
              {mapError}
            </p>
          )}
        </div>

        <aside aria-labelledby="map-results-title" className="min-w-0">
          {navigation.status !== "idle" && (
            <section
              aria-labelledby="navigation-title"
              aria-live="polite"
              className="mb-5 rounded-2xl border border-brand-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="navigation-title"
                    className="text-sm font-bold text-ink-900"
                  >
                    Directions to {navigation.destinationTitle}
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Your location is sent to the routing service for directions.
                    This route is stored only in this browser until you clear it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearNavigation}
                  className="shrink-0 rounded-field px-2 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                >
                  Clear route
                </button>
              </div>

              {(navigation.status === "locating" ||
                navigation.status === "routing") && (
                <p role="status" className="mt-3 text-sm text-ink-600">
                  {navigation.status === "locating"
                    ? "Getting your location…"
                    : "Finding the best driving route…"}
                </p>
              )}

              {navigation.status === "error" && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {navigation.message}
                </p>
              )}

              {navigation.status === "ready" && (
                <>
                  <div className="mt-3 flex gap-4 text-sm font-semibold text-ink-800">
                    <span>{formatRouteDistance(navigation.distance)}</span>
                    <span>{formatRouteDuration(navigation.duration)} drive</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    GPS accuracy: ±{Math.round(navigation.locationAccuracy)} m
                  </p>
                  <ol
                    aria-label="Driving directions"
                    className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-ink-100 pt-3"
                  >
                    {navigation.steps.map((step, index) => (
                      <li
                        key={`${index}-${step.instruction}`}
                        className="flex items-start gap-2 text-xs leading-5 text-ink-700"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-800"
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          {step.instruction}
                        </span>
                        <span className="shrink-0 text-ink-500">
                          {formatRouteDistance(step.distance)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          )}

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                id="map-results-title"
                className="text-lg font-bold text-ink-900"
              >
                {searchPoint ? "Nearby homes" : "Homes on this map"}
              </h2>
            </div>
            {!isLoadingProperties && (
              <span className="text-sm text-ink-500">
                {nearbyProperties.length}
              </span>
            )}
          </div>

          {isLoadingProperties ? (
            <p role="status" className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
              Loading listing locations…
            </p>
          ) : propertiesError ? (
            <p role="alert" className="mt-4 rounded-xl bg-danger-subtle p-4 text-sm text-danger">
              {propertiesError}
            </p>
          ) : nearbyProperties.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink-300 p-5 text-sm leading-6 text-ink-600">
              No listed homes are within 25 km of this location yet. Try a
              nearby town or search the full{" "}
              <Link
                href="/properties"
                className="font-semibold text-brand-800 underline"
              >
                home directory
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1 lg:max-h-[560px]">
              {nearbyProperties.map((property) => (
                <li key={property.id}>
                  <Link
                    href={`/properties/${encodeURIComponent(property.id)}`}
                    onMouseEnter={() => {
                      const entry = propertyMarkersById.current.get(property.id);
                      if (entry) entry.openPopup();
                    }}
                    onMouseLeave={() => {
                      const entry = propertyMarkersById.current.get(property.id);
                      if (entry) entry.closePopup();
                    }}
                    onFocus={() => {
                      const entry = propertyMarkersById.current.get(property.id);
                      if (entry) entry.openPopup();
                    }}
                    onBlur={() => {
                      const entry = propertyMarkersById.current.get(property.id);
                      if (entry) entry.closePopup();
                    }}
                    className="flex items-center gap-3 rounded-xl border border-ink-200 p-2.5 transition hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                  >
                    {property.images[0] && (
                      <Image
                        src={property.images[0]}
                        alt=""
                        width={88}
                        height={72}
                        className="h-[4.5rem] w-[5.5rem] shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`wale-map-key-swatch wale-map-key-swatch--${getListingStatus(property)}`}
                        />
                        <span className="truncate text-xs font-semibold text-ink-500">
                          {listingStatusLabels[getListingStatus(property)]}
                        </span>
                      </span>
                      <span className="mt-1 block truncate font-semibold text-ink-900">
                        {property.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-500">
                        {property.address}, {property.city}
                      </span>
                      <span className="mt-1 block text-sm font-bold text-brand-800">
                        {formatRent(property.price)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
