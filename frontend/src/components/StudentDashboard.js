// src/components/StudentDashboard.js

import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Spin,
  Card,
  Select,
  message,
  Statistic,
  Row,
  Col,
  Form,
  Input,
  Button,
  Collapse,
  List,
} from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Label,
} from "recharts";

// Constants for easy customization
const TEXT_CONSTANTS = {
  titles: {
    dashboard: "Student Dashboard",
    participation: "Participation Count per Session",
    missedSessions: "Missed Sessions",
    loading: "Loading dashboard...",
    loadError: "Failed to load dashboard data.",
    viewDetails: "View Details",
    joinClassroom: "Join Classroom",
    joinSuccess: "Successfully joined the classroom!",
    joinError: "Failed to join the classroom.",
  },
  labels: {
    session: "Session",
    participationCount: "Participation Count",
    totalParticipation: "Total Participation",
    totalMissed: "Total Sessions Missed",
    selectSession: "Filter by Session",
    sessionName: "Session Name",
    classroomCode: "Classroom Code",
    joinButton: "Join",
    noMissedSessions: "You have not missed any sessions. Great job!",
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

const { Panel } = Collapse;

const StudentDashboard = ({ classID, userID, studentName }) => {
  // State Variables
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [joinLoading, setJoinLoading] = useState(false);

  // Fetch dashboard data when classID or studentID changes
  useEffect(() => {
    if (classID && userID) {
      const fetchDashboardData = async () => {
        setDashboardLoading(true);
        try {
          const response = await axios.get(
            `http://localhost:3000/classes/${classID}/students/${userID}/dashboard`
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
  }, [classID, userID]);

  // Handle joining a classroom
  const onJoinClassroom = async (values) => {
    setJoinLoading(true);
    try {
      const response = await axios.post(`http://localhost:3000/classes/join`, {
        classID: values.classroomCode,
        userID: userID,
      });
      if (response.data.success) {
        message.success(TEXT_CONSTANTS.titles.joinSuccess);
        // Optionally, refresh dashboard data if joining affects it
        // You can call fetchDashboardData here if it's defined outside useEffect
      } else {
        message.error(TEXT_CONSTANTS.titles.joinError);
      }
    } catch (error) {
      console.error("Error joining classroom:", error);
      message.error(TEXT_CONSTANTS.titles.joinError);
    } finally {
      setJoinLoading(false);
    }
  };

  // Prepare session options for the Session Filter
  const sessionOptions = useMemo(() => {
    if (!dashboardData) return [];
    const { allClassroomIds, sessionNameById } = dashboardData;
    return allClassroomIds.map((sessId) => ({
      id: sessId,
      name: sessionNameById?.[sessId] || sessId,
    }));
  }, [dashboardData]);

  // Prepare chart data based on session filter
  const chartData = useMemo(() => {
    if (!dashboardData) return [];

    const { participationBySession, sessionNameById } = dashboardData;

    if (sessionFilter === "all") {
      return Object.entries(participationBySession).map(([sessId, count]) => ({
        sessionID: sessId,
        sessionName: sessionNameById[sessId] || sessId,
        participationCount: count,
      }));
    } else {
      const count = participationBySession[sessionFilter] || 0;
      return [
        {
          sessionID: sessionFilter,
          sessionName: sessionNameById[sessionFilter] || sessionFilter,
          participationCount: count,
        },
      ];
    }
  }, [dashboardData, sessionFilter]);

  // Handlers for filter changes
  const onSessionFilterChange = useCallback((value) => {
    setSessionFilter(value);
  }, []);

  return (
    <section style={{ marginTop: "2rem", padding: "0 2rem" }}>
      <h3 className="dashboard-section-title">
        {TEXT_CONSTANTS.titles.dashboard}
      </h3>

      {dashboardLoading ? (
        <Spin tip={TEXT_CONSTANTS.titles.loading} />
      ) : dashboardData ? (
        <>
          {/* Missed Sessions Summary */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card
                hoverable
                style={{ textAlign: "center", backgroundColor: "#fff1f0" }}
              >
                <Statistic
                  title={TEXT_CONSTANTS.labels.totalMissed}
                  value={dashboardData.totalMissed}
                  valueStyle={{ color: "#cf1322" }}
                />
                <Collapse>
                  <Panel header="View Details" key="1">
                    {dashboardData.missedSessions.length > 0 ? (
                      <List
                        size="small"
                        dataSource={dashboardData.missedSessions}
                        renderItem={(session) => (
                          <List.Item key={session.sessionID}>
                            {session.sessionName}
                          </List.Item>
                        )}
                      />
                    ) : (
                      <p>{TEXT_CONSTANTS.labels.noMissedSessions}</p>
                    )}
                  </Panel>
                </Collapse>
              </Card>
            </Col>
            <Col span={18}>
              {/* You can add more fact cards here if needed */}
            </Col>
          </Row>

          {/* Filters */}
          <div style={{ marginBottom: 16 }}>
            <Select
              style={{ width: 200 }}
              value={sessionFilter}
              onChange={onSessionFilterChange}
              placeholder={TEXT_CONSTANTS.labels.selectSession}
              allowClear
            >
              <Select.Option value="all">All Sessions</Select.Option>
              {sessionOptions.map((sess) => (
                <Select.Option key={sess.id} value={sess.id}>
                  {sess.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Participation Chart */}
          <Card style={{ marginBottom: 24 }}>
            <h4 style={{ textAlign: "center" }}>
              {TEXT_CONSTANTS.titles.participation}
            </h4>
            <div style={{ width: "100%", height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="sessionName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  >
                    <Label
                      value={TEXT_CONSTANTS.labels.session}
                      offset={-50}
                      position="insideBottom"
                    />
                  </XAxis>
                  <YAxis>
                    <Label
                      value={TEXT_CONSTANTS.labels.participationCount}
                      angle={-90}
                      position="insideLeft"
                      style={{ textAnchor: "middle" }}
                    />
                  </YAxis>
                  <Tooltip />
                  <Bar
                    dataKey="participationCount"
                    fill={stringToColor(userID)}
                    name={TEXT_CONSTANTS.labels.participationCount}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : (
        <p>No dashboard data available.</p>
      )}
    </section>
  );
};

export default StudentDashboard;
