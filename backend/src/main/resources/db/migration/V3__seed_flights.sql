INSERT INTO airport VALUES
('BOM','Mumbai','Chhatrapati Shivaji Maharaj International'),('DEL','Delhi','Indira Gandhi International'),('BLR','Bengaluru','Kempegowda International'),('HYD','Hyderabad','Rajiv Gandhi International'),('MAA','Chennai','Chennai International'),('CCU','Kolkata','Netaji Subhas Chandra Bose International'),('GOI','Goa','Dabolim'),('PNQ','Pune','Pune International'),('DXB','Dubai','Dubai International'),('SIN','Singapore','Changi');
INSERT INTO airline VALUES(1,'Aeroline','AR');
INSERT INTO aircraft(type,layout,rows,columns_count) VALUES('Airbus A320','3-3',20,6),('Airbus A330','2-4-2',24,8);
INSERT INTO fare_class VALUES('ECONOMY',1,'7 kg cabin + 15 kg checked'),('PREMIUM',1.6,'10 kg cabin + 20 kg checked'),('BUSINESS',2.8,'12 kg cabin + 30 kg checked'),('FIRST',4,'15 kg cabin + 40 kg checked');
INSERT INTO extra VALUES('BAG_NONE','Included baggage','BAGGAGE',0),('BAG_10','Extra 10 kg','BAGGAGE',1500),('BAG_20','Extra 20 kg','BAGGAGE',2800),('MEAL_NONE','No meal','MEAL',0),('MEAL_VEG','Vegetarian meal','MEAL',450),('MEAL_NONVEG','Chicken meal','MEAL',550);
-- Relative dates keep a newly initialized demo useful for 31 days; all schedule times are UTC.
INSERT INTO flight(aircraft_id,airline_id,flight_number,origin,destination,departure,arrival,base_price,status)
SELECT CASE WHEN route.n>=5 THEN 2 ELSE 1 END,1,'AR'||(100+route.n*10+slot)::text,route.o,route.d,
(CURRENT_DATE + day + (6+slot*4)*INTERVAL '1 hour') AT TIME ZONE 'UTC',
(CURRENT_DATE + day + (6+slot*4)*INTERVAL '1 hour'+route.minutes*INTERVAL '1 minute') AT TIME ZONE 'UTC',route.price+slot*450,'SCHEDULED'
FROM (VALUES(1,'BOM','DEL',125,4800),(2,'DEL','BOM',130,4600),(3,'BOM','BLR',100,3900),(4,'BLR','DEL',165,5200),(5,'BOM','DXB',190,14500),(6,'DEL','SIN',350,22500)) AS route(n,o,d,minutes,price),generate_series(0,30) day,generate_series(0,3) slot;
INSERT INTO flight_seat(flight_id,seat_number,row_number,column_index,cabin,features,surcharge,blocked)
SELECT f.id,r::text||chr(65+c),r,c,CASE WHEN r=1 THEN 'FIRST' WHEN r<=3 THEN 'BUSINESS' WHEN r<=5 THEN 'PREMIUM' ELSE 'ECONOMY' END,
concat_ws(',',CASE WHEN c=0 OR c=a.columns_count-1 THEN 'WINDOW' ELSE 'AISLE_OR_MIDDLE' END,'POWER',CASE WHEN r=10 THEN 'EXIT_ROW,EXTRA_LEGROOM' WHEN r=a.rows THEN 'NEAR_LAVATORY,LIMITED_RECLINE' WHEN r=1 THEN 'NEAR_GALLEY' ELSE 'STANDARD_RECLINE' END),CASE WHEN r=10 THEN 900 WHEN c=0 OR c=a.columns_count-1 THEN 250 ELSE 0 END,(r=a.rows AND c=1)
FROM flight f JOIN aircraft a ON a.id=f.aircraft_id CROSS JOIN LATERAL generate_series(1,a.rows) r CROSS JOIN LATERAL generate_series(0,a.columns_count-1) c;
