import { Navigate, Route, Routes } from 'react-router-dom';

import { GuestOnlyRoute, ProtectedRoute } from '../auth/AuthGuards.jsx';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage.jsx';
import { AdminUserDetailsPage } from '../pages/admin/AdminUserDetailsPage.jsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.jsx';
import { AdoptionRequestDetailsPage } from '../pages/adoptions/AdoptionRequestDetailsPage.jsx';
import { AdoptionRequestsAdminPage } from '../pages/adoptions/AdoptionRequestsAdminPage.jsx';
import { CreateAdoptionRequestPage } from '../pages/adoptions/CreateAdoptionRequestPage.jsx';
import { MyAdoptionRequestsPage } from '../pages/adoptions/MyAdoptionRequestsPage.jsx';
import { AnimalDetailsPage } from '../pages/animals/AnimalDetailsPage.jsx';
import { AnimalsInfoPage } from '../pages/animals/AnimalsInfoPage.jsx';
import { AnimalsOverviewPage } from '../pages/animals/AnimalsOverviewPage.jsx';
import { CreateAnimalPage } from '../pages/animals/CreateAnimalPage.jsx';
import { EditAnimalPage } from '../pages/animals/EditAnimalPage.jsx';
import { RescueStoriesPage } from '../pages/animals/RescueStoriesPage.jsx';
import { SpeciesInfoPage } from '../pages/animals/SpeciesInfoPage.jsx';
import { AboutPage } from '../pages/about/AboutPage.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { RegisterPage } from '../pages/auth/RegisterPage.jsx';
import { RescueReportDetailsPage } from '../pages/contact/RescueReportDetailsPage.jsx';
import { RescueReportPage } from '../pages/contact/RescueReportPage.jsx';
import { RescueReportsManagementPage } from '../pages/contact/RescueReportsManagementPage.jsx';
import { DonationDetailsPage } from '../pages/donations/DonationDetailsPage.jsx';
import { DonationPage } from '../pages/donations/DonationPage.jsx';
import { DonationsManagementPage } from '../pages/donations/DonationsManagementPage.jsx';
import { FavoriteAnimalsPage } from '../pages/favorites/FavoriteAnimalsPage.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { AccessDeniedPage } from '../pages/not-found/AccessDeniedPage.jsx';
import { NotFoundPage } from '../pages/not-found/NotFoundPage.jsx';
import { SearchResultsPage } from '../pages/search/SearchResultsPage.jsx';
import { SupportPage } from '../pages/support/SupportPage.jsx';
import { MyProfilePage } from '../pages/users/MyProfilePage.jsx';
import { VolunteerApplicationDetailsPage } from '../pages/volunteers/VolunteerApplicationDetailsPage.jsx';
import { VolunteerApplicationPage } from '../pages/volunteers/VolunteerApplicationPage.jsx';
import { VolunteerApplicationsPage } from '../pages/volunteers/VolunteerApplicationsPage.jsx';

export function AppRoutes({ homeData, role }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage homeData={homeData} role={role} />} />
      <Route path="/animals" element={<Navigate to="/search" replace />} />
      <Route path="/search" element={<SearchResultsPage role={role} />} />
      <Route path="/za-nas" element={<AboutPage />} />
      <Route path="/podkrepa" element={<SupportPage />} />
      <Route path="/za-zhivotnite" element={<AnimalsOverviewPage />} />
      <Route path="/informacia-za-zhivotnite" element={<AnimalsInfoPage />} />
      <Route path="/za-zhivotnite/:species" element={<SpeciesInfoPage />} />
      <Route path="/istorii-za-spasyavaniya" element={<RescueStoriesPage />} />
      <Route path="/volunteers" element={<VolunteerApplicationPage />} />
      <Route path="/donations" element={<DonationPage />} />
      <Route path="/svurji-se-s-nas" element={<RescueReportPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route element={<GuestOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/animals/:animalId" element={<AnimalDetailsPage />} />
      <Route element={<ProtectedRoute allowedRoles={['client', 'employee', 'admin']} />}>
        <Route path="/profile" element={<MyProfilePage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['client']} />}>
        <Route path="/animals/:animalId/adopt" element={<CreateAdoptionRequestPage />} />
        <Route path="/adoptions/my" element={<MyAdoptionRequestsPage />} />
        <Route path="/favorites" element={<FavoriteAnimalsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['client', 'employee', 'admin']} />}>
        <Route path="/adoptions/:requestId" element={<AdoptionRequestDetailsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['employee', 'admin']} />}>
        <Route path="/animals/new" element={<CreateAnimalPage role={role} />} />
        <Route path="/animals/:animalId/edit" element={<EditAnimalPage role={role} />} />
        <Route path="/staff/adoptions" element={<AdoptionRequestsAdminPage />} />
        <Route path="/staff/volunteers" element={<VolunteerApplicationsPage />} />
        <Route path="/staff/volunteers/:applicationId" element={<VolunteerApplicationDetailsPage />} />
        <Route path="/staff/donations" element={<DonationsManagementPage />} />
        <Route path="/staff/donations/:donationId" element={<DonationDetailsPage />} />
        <Route path="/staff/signals" element={<RescueReportsManagementPage />} />
        <Route path="/staff/signals/:reportId" element={<RescueReportDetailsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailsPage />} />
        <Route path="/admin/adoptions" element={<AdoptionRequestsAdminPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/volunteers" element={<VolunteerApplicationsPage />} />
        <Route path="/admin/volunteers/:applicationId" element={<VolunteerApplicationDetailsPage />} />
        <Route path="/admin/donations" element={<DonationsManagementPage />} />
        <Route path="/admin/donations/:donationId" element={<DonationDetailsPage />} />
        <Route path="/admin/signals" element={<RescueReportsManagementPage />} />
        <Route path="/admin/signals/:reportId" element={<RescueReportDetailsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
