import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getDefaultRoute, hasPage } from "./permissions";

/* =========================================================
   ADMIN PAGES
========================================================= */
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Users from "./pages/Users";
import AdminPasswordReset from "./pages/AdminPasswordReset";
import Reports from "./pages/reports";
import Graduation from "./pages/Graduation";
import RegistrationPage from "./pages/RegistrationPage";
import AssessmentFeature from "./pages/AssessmentFeature";
import MarksEntry from "./pages/teacher/MarksEntry";
import LeaveOut from "./pages/LeaveOut";
import Practicum from "./pages/Practicum";
import Meals from "./pages/Meals";
import AttendanceReport from "./pages/AttendanceReport";
import AdminEAssessments from "./pages/AdminEAssessments";
import AdminNotifications from "./pages/AdminNotifications";
import AdminNotificationSettings from "./pages/AdminNotificationSettings";
import StudentCouncil from "./pages/StudentCouncil";
import GatePage from "./pages/GatePage";
import KitchenPage from "./pages/KitchenPage";

/* =========================================================
   AUTH
========================================================= */
import Login from "./pages/Login";
import ForcePasswordChange from "./pages/ForcePasswordChange";

/* =========================================================
   STUDENT
========================================================= */
import StudentLeaveOut from "./pages/Student/StudentLeaveOut";
import StudentLayout from "./pages/Student/StudentLayout";
import StudentDashboard from "./pages/Student/StudentDashboard";
import StudentMarks from "./pages/Student/StudentMarks";
import StudentProfile from "./pages/Student/StudentProfile";
import StudentReport from "./pages/Student/StudentReport";
import StudentNotifications from "./pages/Student/StudentNotifications";
import StudentMealCard from "./pages/Student/StudentMealCard";
import StudentCouncilPortal from "./pages/Student/StudentCouncil";
import TakeAssessment from "./pages/Student/TakeEAssessment";
import TakeAssessmentPicker from "./pages/Student/TakeAssessmentPicker";


/* ================= NEW ================= */
import StudentEAssessments from "./pages/Student/StudentEAssessments";

/* =========================================================
   TEACHER
========================================================= */
import TeacherLayout from "./pages/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherReports from "./pages/teacher/TeacherReports";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherNotifications from "./pages/teacher/TeacherNotifications";
import TeacherAssessments from "./pages/teacher/Teacherassessments";
import TeacherAttendance from "./pages/teacher/Teacherattendance";
import TeacherEAssessments from "./pages/teacher/TeacherEAssessments";
import AddQuestions from "./pages/teacher/AddQuestions";
import TeacherSubmissions from "./pages/teacher/TeacherSubmissions";
import Marking from "./pages/teacher/Marking";
import AllQuestionsMarking from "./pages/teacher/AllQuestionsMarking";


/* =========================================================
   HELPERS
========================================================= */

const getUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    return {};
  }
};

const getToken = () => {
  return localStorage.getItem("token");
};

const isLoggedIn = () => {
  return !!getToken();
};

/* =========================================================
   ROLES
========================================================= */

const ROLES = {
  ADMIN: "admin",
  SUB_ADMIN: "sub_admin",
  SUB_ADMIN_2: "sub_admin_2",
  TEACHER: "teacher",
  STUDENT: "student",
};

/* =========================================================
   PROTECTED ROUTE
========================================================= */

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  page, // page key from permissions.js — only enforced for sub_admin
}) => {
  const user = getUser();

  const role = String(
    user?.role || ""
  ).toLowerCase();

  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    user?.mustChangePassword &&
    window.location.pathname !== "/force-password-change"
  ) {
    return (
      <Navigate
        to="/force-password-change"
        replace
      />
    );
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  // An exam-only session (issued by /take-assessment/:id's own
  // username + exam-password gate, not a real portal login) is only
  // ever allowed on that one standalone exam page — never anywhere
  // else in the student portal, even though its role is "student".
  if (
    user?.examOnly &&
    window.location.pathname !== `/take-assessment/${user.examAssessmentId}`
  ) {
    return (
      <Navigate
        to={`/take-assessment/${user.examAssessmentId || ""}`}
        replace
      />
    );
  }

  // A sub_admin (either tier) only gets in if this page was granted
  // at setup. "admin" is unaffected — hasPage() always returns true
  // for it.
  if (
    (role === ROLES.SUB_ADMIN || role === ROLES.SUB_ADMIN_2) &&
    page &&
    !hasPage(user, page)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
};

/* =========================================================
   PUBLIC ROUTE
========================================================= */

const PublicRoute = ({
  children,
}) => {
  if (isLoggedIn()) {
    const user = getUser();

    if (user?.mustChangePassword) {
      return (
        <Navigate
          to="/force-password-change"
          replace
        />
      );
    }

    return (
      <Navigate
        to={getDefaultRoute(user)}
        replace
      />
    );
  }

  return children;
};

/* =========================================================
   UNAUTHORIZED
========================================================= */

const Unauthorized = () => {
  const navigate =
    useNavigate();

  return (
    <div style={styles.unauthorized}>
      <div style={styles.unauthorizedCard}>
        <h1>403</h1>

        <h2>
          Unauthorized Access
        </h2>

        <p>
          You do not have
          permission to view
          this page.
        </p>

        <button
          style={styles.logoutBtn}
          onClick={() => {
            localStorage.clear();

            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

/* =========================================================
   OLD /student/e-assessments/:id LINKS — forward to the new
   standalone /take-assessment/:id route.
========================================================= */
const TakeAssessmentRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/take-assessment/${id}`} replace />;
};

/* =========================================================
   APP
========================================================= */

export default function App() {
  return (
    <Routes>

      {/* ROOT */}
      <Route
        path="/"
        element={
          isLoggedIn() ? (
            <Navigate
              to={getDefaultRoute(getUser())}
              replace
            />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      {/* LOGIN */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* UNAUTHORIZED */}
      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />

      {/* =====================================================
          STANDALONE EXAM ENTRY POINT — PICKER
          A student can just go to /take-assessment (no id needed),
          log in with their student account, and choose from the
          list of available assessments instead of needing a
          teacher/admin to send them a specific /take-assessment/:id
          link. Deliberately outside any ProtectedRoute — it does
          its own lightweight login gate.
      ===================================================== */}
      <Route
        path="/take-assessment"
        element={<TakeAssessmentPicker />}
      />

      {/* =====================================================
          STANDALONE EXAM ENTRY POINT
          Deliberately outside /student and any ProtectedRoute —
          a student reaches this directly from a link shared by
          their teacher/admin, and logs in with just their
          username + this assessment's exam password (set in
          Admin E-Assessments). No prior /login required.
          TakeEAssessment itself shows its own login gate when
          there's no usable session yet for this assessment.
      ===================================================== */}
      <Route
        path="/take-assessment/:id"
        element={<TakeAssessment />}
      />

      {/* FORCE PASSWORD CHANGE — any logged-in role, no allowedRoles filter */}
      <Route
        path="/force-password-change"
        element={
          isLoggedIn() ? (
            <ForcePasswordChange />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* =====================================================
          ADMIN
      ===================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Dashboard"
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/e-assessments"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="E-Assessments"
          >
            <AdminEAssessments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Students"
          >
            <Students />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Assessment"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Assessments"
          >
            <AssessmentFeature />
          </ProtectedRoute>
        }
      />
      <Route
        path="/Marks"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Marks"
          >
            <MarksEntry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Teachers"
          >
            <Teachers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Users"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Users"
          >
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/password-reset"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Password Reset"
          >
            <AdminPasswordReset />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Reports"
          >
            <Reports />
          </ProtectedRoute>
        }
      />
 <Route
        path="/graduation"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Graduation"
          >
            <Graduation />
          </ProtectedRoute>
        }
      />
       <Route
        path="/registration"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Registration"
          >
            <RegistrationPage />
          </ProtectedRoute>
        }
      />
       <Route
        path="/assessment-feature"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Assessments"
          >
            <AssessmentFeature />
          </ProtectedRoute>
        }
      />
       <Route
        path="/practicum"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Practicum"
          >
            <Practicum />
          </ProtectedRoute>
        }
      /> <Route
        path="/leave-out"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Leave-out"
          >
            <LeaveOut />
          </ProtectedRoute>
        }
      />
       <Route
        path="/meals"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Meals"
          >
            <Meals />
          </ProtectedRoute>
        }
      />
       <Route
        path="/attendance-report"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="AttendanceReport"
          >
            <AttendanceReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-e-assessments"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="E-Assessments"
          >
            <AdminEAssessments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Notifications"
          >
            <AdminNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student-council"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Student Council"
          >
            <StudentCouncil />
          </ProtectedRoute>
        }
      />

      <Route
        path="/gate"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Gate"
          >
            <GatePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kitchen"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Kitchen"
          >
            <KitchenPage />
          </ProtectedRoute>
        }
      />

      {/* Admin-only (never gated by page="Notifications" — a sub_admin
          granted the broadcast page still shouldn't be able to see/edit
          the SMTP/Twilio API credentials this page manages). */}
      <Route
        path="/notification-settings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminNotificationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ASSESSMENTS"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN, ROLES.SUB_ADMIN, ROLES.SUB_ADMIN_2]}
            page="Assessments"
          >
            <AssessmentFeature />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          TEACHER
      ===================================================== */}

      <Route
        path="/teacher"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.TEACHER]}
          >
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />

        <Route
          path="dashboard"
          element={<TeacherDashboard />}
        />

        <Route
          path="students"
          element={<TeacherStudents />}
        />

        <Route
          path="reports"
          element={<TeacherReports />}
        />

        <Route
          path="profile"
          element={<TeacherProfile />}
        />

        <Route
          path="notifications"
          element={<TeacherNotifications />}
        />

        <Route
          path="marks"
          element={<MarksEntry />}
        />

        <Route
          path="assessments"
          element={<TeacherAssessments />}
        />

        <Route
          path="attendance"
          element={<TeacherAttendance />}
        />

        <Route
          path="attendance-report"
          element={<AttendanceReport />}
        />

        <Route
          path="e-assessments"
          element={<TeacherEAssessments />}
        />

        <Route
          path="e-assessments/:id/questions"
          element={<AddQuestions />}
        />

        <Route
          path="e-assessments/:id/submissions"
          element={<TeacherSubmissions />}
        />

        <Route
          path="e-assessments/marking/:id"
          element={<Marking />}
        />
        <Route
  path="/teacher/e-assessments/:id/all-questions-marking"
  element={<AllQuestionsMarking />}
/>
      </Route>

      {/* =====================================================
          STUDENTvgf
      ===================================================== */}

      <Route
        path="/student"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.STUDENT]}
          >
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<StudentDashboard />}
        />

        <Route
          path="dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="marks"
          element={<StudentMarks />}
        />

        <Route
          path="profile"
          element={<StudentProfile />}
        />

        <Route
          path="report"
          element={<StudentReport />}
        />

        <Route
          path="notifications"
          element={<StudentNotifications />}
        />

        <Route
          path="leave"
          element={<StudentLeaveOut />}
        />

        <Route
          path="meals"
          element={<StudentMealCard />}
        />

        <Route
          path="council"
          element={<StudentCouncilPortal />}
        />

        {/* ================= FIXED E-ASSESSMENTS ================= */}

        {/* LIST OF AVAILABLE EXAMS */}
        <Route
          path="e-assessments"
          element={<StudentEAssessments />}
        />

        {/* TAKE EXAM — moved to the standalone /take-assessment/:id
            route (outside this ProtectedRoute) so it can be reached
            without a portal login. This old path just forwards there
            so any existing links/bookmarks keep working. */}
        <Route
          path="e-assessments/:id"
          element={<TakeAssessmentRedirect />}
        />
      </Route>

      {/* =====================================================
          FALLBACK
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  unauthorized: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#020617,#111827,#1e1b4b)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  unauthorizedCard: {
    background:
      "rgba(255,255,255,0.06)",
    padding: 40,
    borderRadius: 24,
    textAlign: "center",
    color: "#fff",
    width: 420,
    maxWidth: "100%",
    border:
      "1px solid rgba(255,255,255,0.08)",
    backdropFilter:
      "blur(12px)",
  },

  logoutBtn: {
    marginTop: 20,
    padding:
      "14px 24px",
    border: "none",
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#dc2626,#ef4444)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
};