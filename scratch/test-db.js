
const { PrismaClient } = require('../generated-client')
const prisma = new PrismaClient()

async function main() {
  try {
    const postCount = await prisma.post.count()
    console.log('Connection successful! Post count:', postCount)
    const firstPost = await prisma.post.findFirst({
        include: { images: true }
    })
    console.log('First post images:', firstPost?.images)
  } catch (e) {
    console.error('Connection failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
