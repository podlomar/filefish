export default {
  contentId: 'folder',
  name: 'projects',
  title: 'projects',
  fsNode: {
    type: 'folder',
    path: '/projects',
    fileName: 'projects',
    ext: ''
  },
  data: {},
  type: 'parent',
  subEntries: [
    {
      contentId: 'folder',
      name: 'projectA',
      title: 'projectA',
      fsNode: {
        type: 'folder',
        path: '/projects/projectA',
        fileName: 'projectA',
        ext: ''
      },
      data: {},
      type: 'parent',
      subEntries: [
        {
          contentId: 'folder',
          name: 'docs',
          title: 'docs',
          fsNode: {
            type: 'folder',
            path: '/projects/projectA/docs',
            fileName: 'docs',
            ext: ''
          },
          data: {},
          type: 'parent',
          subEntries: [
            {
              contentId: 'folder',
              name: 'readme',
              title: 'readme',
              fsNode: {
                type: 'file',
                path: '/projects/projectA/docs/readme.md',
                fileName: 'readme',
                ext: '.md'
              },
              data: {},
              type: 'leaf'
           }
         ]
        },
        {
          contentId: 'folder',
          name: 'package',
          title: 'package',
          fsNode: {
            type: 'file',
            path: '/projects/projectA/package.json',
            fileName: 'package',
            ext: '.json'
          },
          data: {},
          type: 'leaf'
       },
       {
          contentId: 'folder',
          name: 'src',
          title: 'src',
          fsNode: {
            type: 'folder',
            path: '/projects/projectA/src',
            fileName: 'src',
            ext: ''
          },
          data: {},
          type: 'parent',
          subEntries: [
            {
              contentId: 'folder',
              name: 'index',
              title: 'index',
              fsNode: {
                type: 'file',
                path: '/projects/projectA/src/index.html',
                fileName: 'index',
                ext: '.html'
              },
              data: {},
              type: 'leaf'
           },
           {
              contentId: 'folder',
              name: 'index',
              title: 'index',
              fsNode: {
                type: 'file',
                path: '/projects/projectA/src/index.js',
                fileName: 'index',
                ext: '.js'
              },
              data: {},
              type: 'leaf'
           },
           {
              contentId: 'folder',
              name: 'style',
              title: 'style',
              fsNode: {
                type: 'file',
                path: '/projects/projectA/src/style.css',
                fileName: 'style',
                ext: '.css'
              },
              data: {},
              type: 'leaf'
           }
         ]
        }
      ]
    },
    {
      contentId: 'folder',
      name: 'projectB',
      title: 'projectB',
      fsNode: {
        type: 'folder',
        path: '/projects/projectB',
        fileName: 'projectB',
        ext: ''
      },
      data: {},
      type: 'parent',
      subEntries: [
        {
          contentId: 'folder',
          name: 'docs',
          title: 'docs',
          fsNode: {
            type: 'folder',
            path: '/projects/projectB/docs',
            fileName: 'docs',
            ext: ''
          },
          data: {},
          type: 'parent',
          subEntries: [
            {
              contentId: 'folder',
              name: 'readme',
              title: 'readme',
              fsNode: {
                type: 'file',
                path: '/projects/projectB/docs/readme.md',
                fileName: 'readme',
                ext: '.md'
              },
              data: {},
              type: 'leaf'
           }
         ]
        },
        {
          contentId: 'folder',
          name: 'src',
          title: 'src',
          fsNode: {
            type: 'folder',
            path: '/projects/projectB/src',
            fileName: 'src',
            ext: ''
          },
          data: {},
          type: 'parent',
          subEntries: [
            {
              contentId: 'folder',
              name: 'index',
              title: 'index',
              fsNode: {
                type: 'file',
                path: '/projects/projectB/src/index.js',
                fileName: 'index',
                ext: '.js'
              },
              data: {},
              type: 'leaf'
           }
         ]
        }
      ]
    }
  ]
};
