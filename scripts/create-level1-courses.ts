import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createLevel1Courses() {
  try {
    console.log('🚀 Starting to create Level 1 courses for all classes...');

    // Class 6
    const class6 = await prisma.course.create({
      data: {
        title: 'Class 6 - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
        classLevel: '6th',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/f_JMJS2N3gc?si=DWb0hESIv-Al7THS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'f_JMJS2N3gc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/rl7xYT5xwzI?si=DbtBVEARprfUUTJN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'rl7xYT5wzI'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
              content: 'https://drive.google.com/drive/folders/1XDpnW4UXz0Ci7VIgNuy73UbjfZPqYR9w?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Class 6');

    // Class 7
    const class7 = await prisma.course.create({
      data: {
        title: 'Class 7 - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
        classLevel: '7th',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/f_JMJS2N3gc?si=DWb0hESIv-Al7THS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'f_JMJS2N3gc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/rl7xYT5wzI?si=DbtBVEARprfUUTJN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'rl7xYT5wzI'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
              content: 'https://drive.google.com/drive/folders/1XDpnW4UXz0Ci7VIgNuy73UbjfZPqYR9w?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Class 7');

    // Class 8
    const class8 = await prisma.course.create({
      data: {
        title: 'Class 8 - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
        classLevel: '8th',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/f_JMJS2N3gc?si=DWb0hESIv-Al7THS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'f_JMJS2N3gc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/rl7xYT5wzI?si=DbtBVEARprfUUTJN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'rl7xYT5wzI'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
              content: 'https://drive.google.com/drive/folders/1XDpnW4UXz0Ci7VIgNuy73UbjfZPqYR9w?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Class 8');

    // Class 9
    const class9 = await prisma.course.create({
      data: {
        title: 'Class 9 - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
        classLevel: '9th',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/8rrbGtEzIQQ?si=UHjqtvqkCNATDepT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '8rrbGtEzIQQ'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/6yD3vcxma3Q?si=OlGykwu4W0Y4NQu_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '6yD3vcxma3Q'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 3',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/bMrhtnYw71s?si=P7U9P5CtuAfSEXI9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'bMrhtnYw71s'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
              content: 'https://drive.google.com/drive/folders/1zjI9orSf_uRjxJKx4HgdgjIZlvxcogwx?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Class 9');

    // Class 10
    const class10 = await prisma.course.create({
      data: {
        title: 'Class 10 - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
        classLevel: '10th',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/8rrbGtEzIQQ?si=UHjqtvqkCNATDepT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '8rrbGtEzIQQ'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/6yD3vcxma3Q?si=OlGykwu4W0Y4NQu_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '6yD3vcxma3Q'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 3',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/bMrhtnYw71s?si=P7U9P5CtuAfSEXI9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'bMrhtnYw71s'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
              content: 'https://drive.google.com/drive/folders/1zjI9orSf_uRjxJKx4HgdgjIZlvxcogwx?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Class 10');

    // Class 11
    const class11 = await prisma.course.create({
      data: {
        title: 'Class 11 - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
        classLevel: '11th',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/8rrbGtEzIQQ?si=UHjqtvqkCNATDepT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '8rrbGtEzIQQ'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/6yD3vcxma3Q?si=OlGykwu4W0Y4NQu_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '6yD3vcxma3Q'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 3',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/bMrhtnYw71s?si=P7U9P5CtuAfSEXI9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'bMrhtnYw71s'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
              content: 'https://drive.google.com/drive/folders/1zjI9orSf_uRjxJKx4HgdgjIZlvxcogwx?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Class 11');

    // Class 12
    const class12 = await prisma.course.create({
      data: {
        title: 'Class 12 - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
        classLevel: '12th',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/8rrbGtEzIQQ?si=UHjqtvqkCNATDepT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '8rrbGtEzIQQ'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/6yD3vcxma3Q?si=OlGykwu4W0Y4NQu_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: '6yD3vcxma3Q'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 3',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/bMrhtnYw71s?si=P7U9P5CtuAfSEXI9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'bMrhtnYw71s'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
              content: 'https://drive.google.com/drive/folders/1zjI9orSf_uRjxJKx4HgdgjIZlvxcogwx?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Class 12');

    // College
    const college = await prisma.course.create({
      data: {
        title: 'College - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
        classLevel: 'college',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'wUSzhuWDdDc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'KmxTsHAuZpM'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
              content: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for College');

    // UG
    const ug = await prisma.course.create({
      data: {
        title: 'UG - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
        classLevel: 'UG',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'wUSzhuWDdDc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'KmxTsHAuZpM'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
              content: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for UG');

    // PG
    const pg = await prisma.course.create({
      data: {
        title: 'PG - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
        classLevel: 'PG',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'wUSzhuWDdDc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'KmxTsHAuZpM'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
              content: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for PG');

    // PhD
    const phd = await prisma.course.create({
      data: {
        title: 'PhD - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
        classLevel: 'PhD',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'wUSzhuWDdDc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'KmxTsHAuZpM'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
              content: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for PhD');

    // Working
    const working = await prisma.course.create({
      data: {
        title: 'Working - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
        classLevel: 'working',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'wUSzhuWDdDc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'KmxTsHAuZpM'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
              content: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Working');

    // Others
    const others = await prisma.course.create({
      data: {
        title: 'Others - Level 1',
        level: 'Level 1',
        description: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
        classLevel: 'others',
        videos: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'wUSzhuWDdDc'
            },
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
              iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
              youtubeId: 'KmxTsHAuZpM'
            }
          ]
        },
        notes: {
          create: [
            {
              title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
              content: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
            }
          ]
        }
      }
    });
    console.log('✅ Created Level 1 course for Others');

    console.log('\n🎉 Successfully created Level 1 courses for all classes!');
    console.log('\n📊 Summary:');
    console.log('- Classes 6-8: 2 videos + 1 note');
    console.log('- Classes 9-12: 3 videos + 1 note');
    console.log('- College/UG/PG/PhD/Working/Others: 2 videos + 1 note');

  } catch (error) {
    console.error('❌ Error creating Level 1 courses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createLevel1Courses(); 