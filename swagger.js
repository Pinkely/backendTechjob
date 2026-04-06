import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    title: 'TechJob API',
    description: 'ระบบจัดการใบงานช่าง'
  },
  host: 'localhost:3000',
  schemes: ['http'],
  // Security definition สำหรับ JWT Bearer Token
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'ใส่ค่า: Bearer <token>'
    }
  },
  tags: [
    {
      name: 'Users',
      description: 'จัดการข้อมูลผู้ใช้งานและระบบ Login'
    },
    {
      name: 'Works',
      description: 'จัดการใบงาน การมอบหมายงาน และสถานะงาน'
    },
    {
      name: 'Materials',
      description: 'จัดการวัสดุอุปกรณ์และการขอเบิก'
    }
  ]
}

const outputFile = './swagger-output.json'

// แก้ไข: ชี้ไปที่ app.js เพื่อให้ swagger-autogen รู้ prefix (/users, /works, /materials)
const routes = ['./app.js']

swaggerAutogen()(outputFile, routes, doc)