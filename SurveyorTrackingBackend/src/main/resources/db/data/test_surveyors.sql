INSERT INTO surveyor (id, name, city, project_name, username, password) 
VALUES 
('SURV001', 'John Smith', 'New York', 'CityMapping', 'john_smith', 'password123'),
('SURV002', 'Alice Johnson', 'Chicago', 'RoadSurvey', 'alice_j', 'secure456'),
('SURV003', 'Robert Davis', 'Los Angeles', 'UrbanPlanning', 'rob_davis', 'survey789')
ON CONFLICT (id) DO UPDATE 
SET 
  username = EXCLUDED.username,
  password = EXCLUDED.password
WHERE 
  surveyor.username IS NULL;
