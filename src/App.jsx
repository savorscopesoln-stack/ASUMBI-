import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

/* =========================================================
   ADMIN PAGES
========================================================= */
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Graduation from "./pages/Graduation";
import RegistrationPage from "./pages/RegistrationPage";
import AssessmentFeature from "./pages/AssessmentFeature";
import MarksEntry from "./pages/teacher/MarksEntry";
import LeaveOut from "./pages/LeaveOut";
import Practicum from "./pages/Practicum";
import Meals from "./pages/Meals";
import AttendanceReport from "./pages/AttendanceReport";
import AdminEAssessments from "./pages/AdminEAssessments";

/* =========================================================
   AUTH
========================================================= */
import Login from "./pages/Login";

/* =========================================================
   STUDENT
========================================================= */
import StudentLeaveOut from "./pages/student/StudentLeaveOut";
import StudentLayout from "./pages/student/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentMarks from "./pages/student/StudentMarks";
import StudentProfile from "./pages/student/StudentProfile";
import StudentReport from "./pages/student/StudentReport";
import StudentNotifications from "./pages/student/StudentNotifications";
import StudentMealCard from "./pages/student/StudentMealCard";
import TakeAssessment from "./pages/student/TakeEAssessment";

/* ================= NEW ================= */
import StudentEAssessments from "./pages/student/StudentEAssessments";

/* =========================================================
   TEACHER
========================================================= */
import TeacherLayout from "./pages/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherReports from "./pages/teacher/TeacherReports";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherAssessments from "./pages/teacher/TeacherAssessments";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
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
  TEACHER: "teacher",
  STUDENT: "student",
};

/* =========================================================
   PROTECTED ROUTE
========================================================= */

const ProtectedRoute = ({
  children,
  allowedRoles = [],
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

  return children;
};

/* =========================================================
   PUBLIC ROUTE
========================================================= */

const PublicRoute = ({
  children,
}) => {
  if (isLoggedIn()) {
    const role = String(
      getUser()?.role || ""
    ).toLowerCase();

    if (
      role === ROLES.STUDENT
    ) {
      return (
        <Navigate
          to="/student"
          replace
        />
      );
    }

    if (
      role === ROLES.TEACHER
    ) {
      return (
        <Navigate
          to="/teacher"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
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
   APP
========================================================= */

export default function App() {
  const role = String(
    getUser()?.role || ""
  ).toLowerCase();

  return (
    <Routes>

      {/* ROOT */}
      <Route
        path="/"
        element={
          isLoggedIn() ? (
            role === ROLES.STUDENT ? (
              <Navigate
                to="/student"
                replace
              />
            ) : role === ROLES.TEACHER ? (
              <Navigate
                to="/teacher"
                replace
              />
            ) : (
              <Navigate
                to="/dashboard"
                replace
              />
            )
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
          ADMIN
      ===================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/e-assessments"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <AdminEAssessments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Students />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Assessment"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <AssessmentFeature />
          </ProtectedRoute>
        }
      />
      <Route
        path="/Marks"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <MarksEntry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Teachers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Users"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Reports />
          </ProtectedRoute>
        }
      />
 <Route
        path="/graduation"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Graduation />
          </ProtectedRoute>
        }
      />
       <Route
        path="/registration"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <RegistrationPage />
          </ProtectedRoute>
        }
      />
       <Route
        path="/assessment-feature"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <AssessmentFeature />
          </ProtectedRoute>
        }
      />
       <Route
        path="/practicum"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Practicum />
          </ProtectedRoute>
        }
      /> <Route
        path="/leave-out"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <LeaveOut />
          </ProtectedRoute>
        }
      />
       <Route
        path="/meals"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <Meals />
          </ProtectedRoute>
        }
      />
       <Route
        path="/attendance-report"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <AttendanceReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-e-assessments"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
          >
            <AdminEAssessments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ASSESSMENTS"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMIN]}
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

        {/* ================= FIXED E-ASSESSMENTS ================= */}

        {/* LIST OF AVAILABLE EXAMS */}
        <Route
          path="e-assessments"
          element={<StudentEAssessments />}
        />

        {/* TAKE EXAM */}
        <Route
          path="e-assessments/:id"
          element={<TakeAssessment />}
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