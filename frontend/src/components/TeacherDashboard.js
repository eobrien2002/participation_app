// TeacherDashboard.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Radio, Spin, Card, Table, Select, message } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts";
import "../css/TeacherDashboard.css"; // Import the custom CSS
import "../css/styles.css";

// Constants for easy customization
const TEXT_CONSTANTS = {
  titles: {
    dashboard: "Dashboard",
    participation: "Total Participation",
    attendance: "Student Absences",
    byStudent: "per Student",
    bySession: "by Session",
    loading: "Loading dashboard...",
    loadError: "Failed to load dashboard data.",
    detailsFor: "Details for",
  },
  labels: {
    student: "Student",
    session: "Session",
    participationCount: "Participation Count",
    missedCount: "Classes Missed",
    timesParticipated: "Times Participated",
    timesMissed: "Times Missed",
    sessionMissed: "Session Missed",
    studentEmail: "Student Email",
    allSessions: "All Sessions",
    selectStudents: "Select Students",
  },
};

// Utility function to generate deterministic colors
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32bit integer
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 65;
  const lightness = 55;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Reusable Controls Component
const Controls = ({
  viewType,
  onViewTypeChange,
  dimension,
  onDimensionChange,
  studentFilter,
  onStudentFilterChange,
  sessionFilter,
  onSessionFilterChange,
  students,
  studentNameMap,
  sessionOptions,
}) => (
  <div className="teacherdashboard-controls">
    {/* View Type Selection */}
    <div className="control-item">
      <Radio.Group value={viewType} onChange={onViewTypeChange}>
        <Radio.Button value="participation">Participation</Radio.Button>
        <Radio.Button value="attendance">Attendance</Radio.Button>
      </Radio.Group>
    </div>

    {/* Dimension Selection */}
    <div className="control-item">
      <Radio.Group value={dimension} onChange={onDimensionChange}>
        <Radio.Button value="byStudent">By Student</Radio.Button>
        <Radio.Button value="bySession">By Session</Radio.Button>
      </Radio.Group>
    </div>

    {/* Student Filter */}
    <div className="control-item">
      <Select
        mode="multiple"
        className="select"
        placeholder={TEXT_CONSTANTS.labels.selectStudents}
        value={studentFilter}
        onChange={onStudentFilterChange}
        allowClear
        disabled={!dimension}
      >
        {students.map((s) => (
          <Select.Option key={s.id} value={s.id}>
            {studentNameMap[s.id]}
          </Select.Option>
        ))}
      </Select>
    </div>

    {/* Session Filter */}
    <div className="control-item">
      <Select
        className="session-select"
        value={sessionFilter}
        onChange={onSessionFilterChange}
        disabled={dimension !== "bySession"}
      >
        <Select.Option value="all">
          {TEXT_CONSTANTS.labels.allSessions}
        </Select.Option>
        {sessionOptions.map((sess) => (
          <Select.Option key={sess.id} value={sess.id}>
            {sess.name}
          </Select.Option>
        ))}
      </Select>
    </div>
  </div>
);

// Reusable Chart Section Component
const ChartSection = ({
  chartData,
  viewType,
  dimension,
  renderBars,
  onChartClick,
  textConstants,
}) => (
  <Card className="teacherdashboard-chart-card">
    <h4 className="teacherdashboard-chart-title">
      {viewType === "participation"
        ? textConstants.participation
        : textConstants.attendance}{" "}
      {dimension === "byStudent"
        ? textConstants.byStudent
        : textConstants.bySession}
    </h4>
    <div className="teacherdashboard-chart-container">
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 80 }}
          onClick={onChartClick}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={60}>
            <Label
              value={
                dimension === "byStudent"
                  ? textConstants.labels.student
                  : textConstants.labels.session
              }
              offset={-50}
              position="insideBottom"
            />
          </XAxis>
          <YAxis>
            <Label
              value={
                viewType === "participation"
                  ? textConstants.labels.participationCount
                  : textConstants.labels.missedCount
              }
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: "middle" }}
            />
          </YAxis>
          <Tooltip />
          <Legend />

          {renderBars()}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

// Reusable Drill-Down Table Component
const DrillDownTable = ({
  drilledEntity,
  drilldownTableData,
  columns,
  textConstants,
}) => (
  <Card className="teacherdashboard-drilldown-card">
    <h4>
      {textConstants.titles.detailsFor} {drilledEntity.name}
    </h4>
    <Table
      dataSource={drilldownTableData}
      columns={columns}
      pagination={false}
      rowKey="key"
      style={{ marginTop: 16 }}
    />
  </Card>
);

const TeacherDashboard = ({ role, classID, students }) => {
  // State Variables
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [viewType, setViewType] = useState("participation"); // "participation" or "attendance"
  const [dimension, setDimension] = useState("byStudent"); // "byStudent" or "bySession"
  const [studentFilter, setStudentFilter] = useState([]);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [drilledEntity, setDrilledEntity] = useState(null);

  // Memoize color map based on student IDs
  const colorMap = useMemo(() => {
    const map = {};
    students.forEach((student) => {
      map[student.id] = stringToColor(student.id.toString());
    });
    return map;
  }, [students]);

  // Memoize student name mapping for easy reference
  const studentNameMap = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      map[s.id] = s.name || s.email || `Student-${s.id}`;
    });
    return map;
  }, [students]);

  // Fetch dashboard data when role or classID changes
  useEffect(() => {
    if (role === "teacher" && classID) {
      const fetchDashboardData = async () => {
        setDashboardLoading(true);
        try {
          const response = await axios.get(
            `http://localhost:3000/classes/${classID}/dashboard`
          );
          if (response.data.success) {
            setDashboardData(response.data.data);
          } else {
            message.error(TEXT_CONSTANTS.titles.loadError);
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          message.error(TEXT_CONSTANTS.titles.loadError);
        } finally {
          setDashboardLoading(false);
        }
      };
      fetchDashboardData();
    }
  }, [role, classID]);

  // Handlers for control changes
  const onViewTypeChange = useCallback((e) => {
    setViewType(e.target.value);
    setDrilledEntity(null);
  }, []);

  const onDimensionChange = useCallback((e) => {
    setDimension(e.target.value);
    setDrilledEntity(null);
    setStudentFilter([]);
  }, []);

  const onStudentFilterChange = useCallback((val) => {
    setStudentFilter(val);
    setDrilledEntity(null);
  }, []);

  const onSessionFilterChange = useCallback((val) => {
    setSessionFilter(val);
    setDrilledEntity(null);
  }, []);

  // Handle bar click for drill-down
  const handleBarClick = useCallback((data, key) => {
    setDrilledEntity({ ...data, key });
  }, []);

  // Prepare session options for the Session Filter
  const sessionOptions = useMemo(() => {
    if (!dashboardData) return [];
    const { allClassroomIds, sessionNameById } = dashboardData;
    return (allClassroomIds || []).map((sessId) => ({
      id: sessId,
      name: sessionNameById?.[sessId] || sessId,
    }));
  }, [dashboardData]);

  // Prepare chart data based on current filters and view
  const chartData = useMemo(() => {
    if (!dashboardData) return [];

    const {
      participationByStudent,
      participationBySession,
      attendanceByStudent,
      attendanceBySession,
      sessionNameById,
    } = dashboardData;

    const isStudentFiltered = studentFilter.length > 0;
    const selectedStudents = isStudentFiltered
      ? students.filter((s) => studentFilter.includes(s.id))
      : students;

    const filterStudents = (userId) =>
      !isStudentFiltered || studentFilter.includes(userId);

    if (viewType === "participation") {
      if (dimension === "byStudent") {
        return Object.entries(participationByStudent || {})
          .filter(([userId]) => filterStudents(userId))
          .map(([userId, totalCount]) => ({
            name: studentNameMap[userId] || `User ${userId}`,
            userId,
            value: totalCount,
          }));
      } else {
        // bySession
        return Object.entries(participationBySession || {})
          .filter(([sessionId]) =>
            sessionFilter === "all" ? true : sessionId === sessionFilter
          )
          .map(([sessionId, partMap]) => {
            const sessionName = sessionNameById[sessionId] || sessionId;
            const dataPoint = { name: sessionName, sessionId };
            selectedStudents.forEach((s) => {
              dataPoint[s.name || s.email || `Student-${s.id}`] =
                partMap[s.id] || 0;
            });
            return dataPoint;
          });
      }
    } else {
      // attendance
      if (dimension === "byStudent") {
        return Object.entries(attendanceByStudent || {})
          .filter(([userId]) => filterStudents(userId))
          .map(([userId, attObj]) => ({
            name: studentNameMap[userId] || `User ${userId}`,
            userId,
            value: attObj.missedCount || 0,
          }));
      } else {
        // bySession
        return Object.entries(attendanceBySession || {})
          .filter(([sessionId]) =>
            sessionFilter === "all" ? true : sessionId === sessionFilter
          )
          .map(([sessionId, attendMap]) => {
            const sessionName = sessionNameById[sessionId] || sessionId;
            const dataPoint = { name: sessionName, sessionId };
            selectedStudents.forEach((s) => {
              dataPoint[s.name || s.email || `Student-${s.id}`] = !attendMap[
                s.id
              ]
                ? 1
                : 0;
            });
            return dataPoint;
          });
      }
    }
  }, [
    dashboardData,
    viewType,
    dimension,
    studentFilter,
    sessionFilter,
    studentNameMap,
    students,
  ]);

  // Prepare drill-down table data based on drilled entity
  const drilldownTableData = useMemo(() => {
    if (!drilledEntity || !dashboardData) return [];

    const {
      participationBySession,
      attendanceBySession,
      attendanceByStudent,
      sessionNameById,
    } = dashboardData;

    if (viewType === "participation") {
      if (dimension === "byStudent") {
        const userId = drilledEntity.key;
        return Object.entries(participationBySession || {}).map(
          ([sessId, partMap]) => ({
            key: sessId,
            sessionName: sessionNameById[sessId] || sessId,
            count: partMap[userId] || 0,
          })
        );
      } else {
        // bySession
        const sessionId = drilledEntity.key;
        const partMap = participationBySession[sessionId] || {};
        return Object.entries(partMap).map(([userId, cnt]) => ({
          key: userId,
          userName: studentNameMap[userId] || `User ${userId}`,
          count: cnt,
        }));
      }
    } else {
      // attendance
      if (dimension === "byStudent") {
        const userId = drilledEntity.key;
        const missedSessions =
          attendanceByStudent[userId]?.sessionsMissed || [];
        return missedSessions.map((sessId) => ({
          key: sessId,
          sessionName: sessionNameById[sessId] || sessId,
        }));
      } else {
        // bySession
        const sessionId = drilledEntity.key;
        const attendMap = attendanceBySession[sessionId] || {};
        const missedStudents = students.filter((s) => !attendMap[s.id]);
        return missedStudents.map((s) => ({
          key: s.id,
          studentName: studentNameMap[s.id],
          studentEmail: s.email || "N/A",
        }));
      }
    }
  }, [
    drilledEntity,
    dashboardData,
    viewType,
    dimension,
    studentNameMap,
    students,
  ]);

  // Define table columns based on view and dimension
  const columns = useMemo(() => {
    if (viewType === "participation") {
      if (dimension === "byStudent") {
        return [
          {
            title: TEXT_CONSTANTS.labels.session,
            dataIndex: "sessionName",
            key: "sessionName",
          },
          {
            title: TEXT_CONSTANTS.labels.timesParticipated,
            dataIndex: "count",
            key: "count",
          },
        ];
      } else {
        return [
          {
            title: TEXT_CONSTANTS.labels.student,
            dataIndex: "userName",
            key: "userName",
          },
          {
            title: TEXT_CONSTANTS.labels.timesParticipated,
            dataIndex: "count",
            key: "count",
          },
        ];
      }
    } else {
      // attendance
      if (dimension === "byStudent") {
        return [
          {
            title: TEXT_CONSTANTS.labels.sessionMissed,
            dataIndex: "sessionName",
            key: "sessionName",
          },
        ];
      } else {
        return [
          {
            title: TEXT_CONSTANTS.labels.student,
            dataIndex: "studentName",
            key: "studentName",
          },
          {
            title: TEXT_CONSTANTS.labels.studentEmail,
            dataIndex: "studentEmail",
            key: "studentEmail",
          },
        ];
      }
    }
  }, [viewType, dimension]);

  // Dynamic Bar components for Recharts based on dimension
  const renderBars = useCallback(() => {
    if (dimension === "bySession") {
      const isStudentFiltered = studentFilter.length > 0;
      const selectedStudents = isStudentFiltered
        ? students.filter((s) => studentFilter.includes(s.id))
        : students;

      return selectedStudents.map((s) => {
        const studentName = s.name || s.email || `Student-${s.id}`;
        return (
          <Bar
            key={s.id}
            dataKey={studentName}
            fill={colorMap[s.id]}
            name={studentName}
          />
        );
      });
    } else if (dimension === "byStudent") {
      return <Bar dataKey="value" fill="#1890ff" />;
    }
    return null;
  }, [dimension, studentFilter, students, colorMap]);

  // Handle chart click for drill-down
  const onChartClick = useCallback(
    (chartEvent) => {
      if (chartEvent?.activePayload?.length > 0) {
        const payload = chartEvent.activePayload[0].payload;
        const clickedKey =
          dimension === "byStudent"
            ? payload.userId || payload.key
            : payload.sessionId || payload.key;
        handleBarClick(payload, clickedKey);
      }
    },
    [dimension, handleBarClick]
  );

  return (
    <section className="teacherdashboard-section">
      <h3 className="classpage-section-title">
        {TEXT_CONSTANTS.titles.dashboard}
      </h3>

      {dashboardLoading ? (
        <Spin tip={TEXT_CONSTANTS.titles.loading} />
      ) : dashboardData ? (
        <>
          {/* Controls */}
          <Controls
            viewType={viewType}
            onViewTypeChange={onViewTypeChange}
            dimension={dimension}
            onDimensionChange={onDimensionChange}
            studentFilter={studentFilter}
            onStudentFilterChange={onStudentFilterChange}
            sessionFilter={sessionFilter}
            onSessionFilterChange={onSessionFilterChange}
            students={students}
            studentNameMap={studentNameMap}
            sessionOptions={sessionOptions}
          />

          {/* Chart Section */}
          <ChartSection
            chartData={chartData}
            viewType={viewType}
            dimension={dimension}
            renderBars={renderBars}
            onChartClick={onChartClick}
            textConstants={TEXT_CONSTANTS}
          />

          {/* Drill-down Table */}
          {drilledEntity && (
            <DrillDownTable
              drilledEntity={drilledEntity}
              drilldownTableData={drilldownTableData}
              columns={columns}
              textConstants={TEXT_CONSTANTS}
            />
          )}
        </>
      ) : null}
    </section>
  );
};

export default TeacherDashboard;
