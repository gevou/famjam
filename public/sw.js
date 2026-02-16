self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'FamJam', body: 'Someone signed in!' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png',
    })
  )
})
