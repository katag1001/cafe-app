import AddCafe from "../components/cafes/add_cafes/AddCafe";

function NewCafe({ currentUser, authLoading }) {
  return (
    <main>
      <h1>New Cafe</h1>
      <p>This is the New Cafe page.</p>
      {authLoading ? <p>Loading...</p> : <AddCafe currentUser={currentUser} />}
    </main>
  )
}

export default NewCafe

