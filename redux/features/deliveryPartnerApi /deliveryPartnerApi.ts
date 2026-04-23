import { api } from "../../api/apiSlice"

// Types
export interface VehicleInfo {
  type: "bicycle" | "bike" | "car" | "van";
  model?: string;
  plateNumber?: string;
  color?: string;
  year?: number;
}

export interface LicenseInfo {
  number: string;
  expiryDate: string;
  image: string;
}

export interface Documents {
  license: LicenseInfo;
  insurance?: {
    number: string;
    expiryDate: string;
    image: string;
  };
  vehicleRegistration?: {
    number: string;
    expiryDate: string;
    image: string;
  };
}

export interface WorkingHours {
  start: string;
  end: string;
  timezone: string;
}

export interface Preferences {
  maxDistance: number;
  minDeliveryFee: number;
  acceptedPackageTypes: string[];
}

export interface DeliveryPartnerInfo {
  vehicle: VehicleInfo;
  documents: Documents;
  status: "available" | "busy" | "offline" | "on_break";
  rating: number;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageRating: number;
  earnings: {
    total: number;
    pending: number;
    available: number;
    lastPayout?: string;
  };
  location?: {
    coordinates: {
      lat: number;
      lng: number;
    };
    lastUpdated: string;
  };
  online: boolean;
  workingHours: WorkingHours;
  preferences: Preferences;
  verificationStatus: {
    identity: boolean;
    vehicle: boolean;
    backgroundCheck: boolean;
    verified: boolean;
  };
}

export interface UpdateVehicleRequest {
  type: "bicycle" | "bike" | "car" | "van";
  model?: string;
  plateNumber?: string;
  color?: string;
  year?: number;
}

export interface UpdateDocumentsRequest {
  license?: Partial<LicenseInfo>;
  insurance?: {
    number: string;
    expiryDate: string;
    image: string;
  };
  vehicleRegistration?: {
    number: string;
    expiryDate: string;
    image: string;
  };
}

export interface UpdateWorkingHoursRequest {
  start: string;
  end: string;
  timezone?: string;
}

export interface UpdatePreferencesRequest {
  maxDistance?: number;
  minDeliveryFee?: number;
  acceptedPackageTypes?: string[];
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
}

export interface UpdateStatusRequest {
  status: "available" | "busy" | "offline" | "on_break";
}

export interface DeliveryPartnerProfileResponse {
  success: boolean;
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    userType: string;
    deliveryPartnerInfo: DeliveryPartnerInfo;
  };
}

// Define the base URL for your API
export const deliveryPartnerApi = api.injectEndpoints({
  endpoints: (builder) => ({


    // Update working hours
    updateWorkingHours: builder.mutation<
      { success: boolean; message: string; workingHours: WorkingHours },
      UpdateWorkingHoursRequest
    >({
      query: (workingHoursData) => ({
        url: 'working-hours',
        method: 'PUT',
        body: workingHoursData,
      }),
    }),

    // Update location
    updateLocation: builder.mutation<
      { success: boolean; message: string; location: { coordinates: { lat: number; lng: number }; lastUpdated: string } },
      UpdateLocationRequest
    >({
      query: (locationData) => ({
        url: 'location-settings',
        method: 'PUT',
        body: locationData,
      }),
    }),

    // Update status
    updateStatus: builder.mutation<
      { success: boolean; message: string; status: string; online: boolean },
      UpdateStatusRequest
    >({
      query: (statusData) => ({
        url: 'driver-status',
        method: 'PUT',
        body: statusData,
      }),
    }),
  }),
});

export const {
  useUpdateWorkingHoursMutation,
  useUpdateLocationMutation,
  useUpdateStatusMutation,
} = deliveryPartnerApi;