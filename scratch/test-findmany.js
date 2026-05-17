
const { PrismaClient } = require('../generated-client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing findMany...')
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        likedBy: true,
        images: true,
      },
    })
    console.log('Successfully fetched', posts.length, 'posts')
    if (posts.length > 0) {
        console.log('First post images count:', posts[0].images.length)
    }
  } catch (e) {
    console.error('findMany failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
