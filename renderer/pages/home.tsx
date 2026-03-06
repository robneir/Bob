import React from 'react'
import Head from 'next/head'
import WidgetContainer from '../components/widget/widget-container'

export default function WidgetPage() {
  return (
    <>
      <Head>
        <title>Bob</title>
      </Head>
      <style jsx global>{`
        html,
        body,
        #__next {
          background: transparent !important;
        }
      `}</style>
      <div className="h-screen w-screen bg-transparent overflow-hidden">
        <WidgetContainer />
      </div>
    </>
  )
}
